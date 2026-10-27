// POST /api/check: the only server code. Validates the request, screens for crisis
// wording, applies rate limits and the daily cap, then asks Claude for a verdict.
// Never logs tip text or profile data.
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { CRISIS_RE, DEFAULT_MODEL, sanitizeRequest, checkTip } from "../lib/verity.js";

const MAX_BODY = 8 * 1024;
const PER_MINUTE = 10, PER_DAY = 60;
const MAX_DAILY = Number(process.env.MAX_DAILY_CHECKS) || 1000;
const MODEL = process.env.VERITY_MODEL || DEFAULT_MODEL;

let client = null;
// Keys pasted into a dashboard often carry a stray space, line break or quotes, which make
// every call fail instantly. Clean them off, and log (never the key) when that happened.
function cleanKey(raw){ return String(raw || "").trim().replace(/^["']+|["']+$/g, "").trim(); }
function getClient(){
  if (client) return client;
  const raw = process.env.ANTHROPIC_API_KEY;
  if (!raw) return (client = new Anthropic());
  const key = cleanKey(raw);
  if (key !== raw) log({ warn: "api_key_had_extra_characters" });
  if (/[^\x21-\x7E]/.test(key)) log({ warn: "api_key_has_invalid_characters", hint: "re-copy the full key; look for curly quotes, an ellipsis or a line break" });
  else if (!/^sk-ant-[A-Za-z0-9_-]+$/.test(key)) log({ warn: "api_key_unexpected_format", length: key.length });
  return (client = new Anthropic({ apiKey: key }));
}
export function setClientForTests(c){ client = c; }

/* ---------- counters: Upstash Redis when configured, else a best-effort in-memory map ---------- */
// The in-memory fallback lives per serverless instance, so limits are approximate when
// Vercel runs several instances or recycles one. Connect Upstash for real limits.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const mem = new Map();

async function incr(key, ttlSec){
  if (REDIS_URL && REDIS_TOKEN){
    const r = await fetch(REDIS_URL.replace(/\/$/, "") + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + REDIS_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(ttlSec), "NX"]])
    });
    if (!r.ok) throw new Error("redis " + r.status);
    const out = await r.json();
    return Number(out[0].result);
  }
  const now = Date.now();
  if (mem.size > 5000) for (const [k, v] of mem) if (v.exp < now) mem.delete(k);
  const cur = mem.get(key);
  if (!cur || cur.exp < now){ mem.set(key, { n: 1, exp: now + ttlSec * 1000 }); return 1; }
  cur.n += 1;
  return cur.n;
}

function clientIp(req){
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || String(req.headers["x-real-ip"] || "") || (req.socket && req.socket.remoteAddress) || "unknown";
}
const hashIp = (ip) => createHash("sha256").update(ip).digest("hex").slice(0, 16);

/* ---------- helpers ---------- */
function send(res, status, body){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
function log(fields){ console.log(JSON.stringify({ route: "check", ...fields })); }

function sameOrigin(req){
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try{ return new URL(origin).host === req.headers.host; }catch(e){ return false; }
}

async function readBody(req){
  if (req.body !== undefined){
    if (typeof req.body === "string") return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
    return JSON.stringify(req.body);
  }
  let size = 0; const chunks = [];
  for await (const c of req){ size += c.length; if (size > MAX_BODY) return null; chunks.push(c); }
  return Buffer.concat(chunks).toString("utf8");
}

/* ---------- handler ---------- */
export default async function handler(req, res){
  const t0 = Date.now();
  const done = (status, body, extra) => { log({ status, ms: Date.now() - t0, ...extra }); send(res, status, body); };

  if (req.method !== "POST"){ res.setHeader("Allow", "POST"); return done(405, { error: "method_not_allowed" }); }
  if (!sameOrigin(req)) return done(403, { error: "forbidden" });
  if (Number(req.headers["content-length"] || 0) > MAX_BODY) return done(413, { error: "too_large" });

  let rawBody;
  try{ rawBody = await readBody(req); }catch(e){ return done(400, { error: "bad_request" }); }
  if (rawBody === null || Buffer.byteLength(rawBody) > MAX_BODY) return done(413, { error: "too_large" });
  let body;
  try{ body = JSON.parse(rawBody); }catch(e){ return done(400, { error: "bad_request" }); }
  const input = sanitizeRequest(body);
  if (!input) return done(400, { error: "bad_request" });

  // Crisis wording gets the 988 card right away: no Claude call, no rate limit.
  if (CRISIS_RE.test(input.tip)) return done(200, { status: "crisis" }, { result: "crisis" });

  try{
    const ip = hashIp(clientIp(req));
    const minute = Math.floor(Date.now() / 60000), day = new Date().toISOString().slice(0, 10);
    const [perMin, perDay] = await Promise.all([
      incr(`rl:m:${ip}:${minute}`, 70),
      incr(`rl:d:${ip}:${day}`, 90000)
    ]);
    if (perMin > PER_MINUTE || perDay > PER_DAY) return done(429, { error: "rate_limited" });
    const total = await incr(`cap:${day}`, 90000);
    if (total > MAX_DAILY) return done(503, { error: "busy" });
  }catch(e){
    log({ warn: "counter_unavailable" }); // fail open: a broken counter shouldn't take the booth down
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN){
    return done(502, { error: "upstream" }, { error: "upstream", reason: "missing_api_key" });
  }
  try{
    const { data, attempts } = await checkTip(getClient(), input, { model: MODEL });
    return done(200, data, { result: data.status, attempts });
  }catch(e){
    const code = (e && e.code) || "upstream";
    // An error with no code was thrown before any request left (for example while creating the client).
    // Log its name and message, with anything key-shaped removed.
    const local = e && !e.code ? { errName: e.name, errMessage: String(e.message || "").replace(/sk-ant-[A-Za-z0-9_-]+/g, "[key]").slice(0, 200) } : {};
    return done(code === "timeout" ? 504 : 502, { error: code }, { error: code, upstream: e && e.status, apiType: e && e.apiType, apiMessage: e && e.apiMessage, errName: e && e.errName, errCause: e && e.errCause, model: MODEL, ...local });
  }
}
