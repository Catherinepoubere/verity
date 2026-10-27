// Offline tests with a fake Claude client: no API key or network needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { normalize, sanitizeRequest, checkTip, buildPrompt, requestParams, GUARD_RE } from "../lib/verity.js";
import handler, { setClientForTests } from "../api/check.js";

const good = {
  status: "ok", category: "money", claim_summary: "Pay off card debt first — then invest!",
  evidence: { verdict: "mixed", why: "It depends!! On rates.", basis: "basic consumer finance" },
  red_flags: ["urgency", "urgency", "made_up"],
  fit: { verdict: "for_you", reason: "You have debt.", profile_fields_used: ["high_interest_debt", "skin_type"] },
  next_step: "List your balances and rates.", ask_a_pro: { needed: false, who: "none", why: "" }, confidence: "high"
};
const fake = (texts) => {
  let i = 0; const calls = [];
  const create = async (p) => { calls.push(p); const t = texts[Math.min(i++, texts.length - 1)]; return { stop_reason: "end_turn", content: [{ type: "text", text: t }] }; };
  return { calls, messages: { create }, beta: { messages: { create } } };
};

test("normalize applies the brief's rules", () => {
  const d = normalize(good, { profile: { high_interest_debt: "Yes" } });
  assert.equal(d.confidence, "medium");
  assert.deepEqual(d.red_flags, ["urgency"]);
  assert.deepEqual(d.fit.profile_fields_used, ["high_interest_debt"]);
  assert.equal(d.claim_summary, "Pay off card debt first, then invest.");
  assert.equal(d.evidence.why, "It depends. On rates.");
  assert.equal(normalize(good, { profile: null }).fit.verdict, "need_profile");
  assert.equal(normalize({ ...good, evidence: { ...good.evidence, verdict: "true" } }, {}), null);
  assert.equal(normalize({ ...good, confidence: "very" }, {}), null);
  assert.equal(normalize({ ...good, next_step: "" }, {}), null);
});

test("sanitizeRequest keeps only known profile keys and trims the tip", () => {
  const r = sanitizeRequest({ tip: "x".repeat(3000), profile: { skin_type: "Dry", evil: "y", skin_concerns: ["Acne", 3], life_stage: 5 }, category: "nope", catOverride: true });
  assert.equal(r.tip.length, 2000);
  assert.deepEqual(r.profile, { skin_type: "Dry", skin_concerns: ["Acne"] });
  assert.equal(r.category, ""); assert.equal(r.catOverride, false);
  assert.equal(sanitizeRequest({ tip: 4 }), null);
});

test("buildPrompt carries the tip as quoted data and the profile", () => {
  const p = buildPrompt({ tip: 'say """hi', source: "", sponsored: "", category: "", catOverride: false, profile: null });
  assert.match(p, /Tip: """say "hi"""/);
  assert.match(p, /Profile \(only the fields the user filled in\): none/);
});

test("requestParams never sends temperature", () => {
  for (const m of ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"]) assert.equal("temperature" in requestParams(m, "x"), false);
});

test("checkTip retries once on bad output, then gives up", async () => {
  const c1 = fake(["not json", "Here: " + JSON.stringify(good)]);
  const r = await checkTip(c1, { tip: "t", profile: null }, {});
  assert.equal(r.attempts, 2);
  const c2 = fake(["nope", "{bad"]);
  await assert.rejects(checkTip(c2, { tip: "t", profile: null }, {}), { code: "bad_output" });
  assert.equal(c2.calls.length, 2);
});

test("checkTip times out", async () => {
  const slow = { beta: { messages: { create: (p, o) => new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "APIUserAbortError" })))) } } };
  await assert.rejects(checkTip(slow, { tip: "t", profile: null }, { timeoutMs: 1200 }), { code: "timeout" });
});

test("GUARD_RE flags brands, doses and diagnoses but not plain advice", () => {
  assert.ok(GUARD_RE.test("try CeraVe"));
  assert.ok(GUARD_RE.test("take 500 mg"));
  assert.ok(GUARD_RE.test("you probably have rosacea"));
  assert.ok(!GUARD_RE.test("A mineral sunscreen made for sensitive skin is a common alternative."));
});

function call(body, headers = {}, method = "POST"){
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const req = Readable.from([Buffer.from(raw)]);
  req.method = method;
  req.headers = { host: "verity.test", "content-type": "application/json", "x-forwarded-for": headers.ip || "1.2.3.4", ...headers };
  req.socket = {};
  return new Promise((resolve) => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v){ this.headers[k.toLowerCase()] = v; }, end(b){ resolve({ status: this.statusCode, body: JSON.parse(b), headers: this.headers }); } };
    handler(req, res);
  });
}

test("handler: method, origin, size and crisis", async () => {
  const log = console.log; console.log = () => {};
  try{
    assert.equal((await call({}, {}, "GET")).status, 405);
    assert.equal((await call({ tip: "hi" }, { origin: "https://evil.example" })).status, 403);
    assert.equal((await call({ tip: "x".repeat(9000) })).status, 413);
    assert.equal((await call("{nope")).status, 400);
    const fc = fake([JSON.stringify(good)]); setClientForTests(fc);
    const c = await call({ tip: "I want to die" });
    assert.deepEqual(c.body, { status: "crisis" });
    assert.equal(fc.calls.length, 0);
  } finally { console.log = log; }
});

test("handler: verdict, logs without tip text, and rate limit", async () => {
  const lines = []; const log = console.log; console.log = (s) => lines.push(s);
  try{
    setClientForTests(fake([JSON.stringify(good)]));
    const ok = await call({ tip: "secret tip text", profile: { skin_type: "Dry" } }, { ip: "9.9.9.9", origin: "https://verity.test" });
    assert.equal(ok.status, 200); assert.equal(ok.body.status, "ok");
    assert.ok(lines.every(l => !l.includes("secret") && !l.includes("Dry")));
    let last;
    for (let i = 0; i < 10; i++) last = await call({ tip: "another tip" }, { ip: "9.9.9.9" });
    assert.equal(last.status, 429); assert.deepEqual(last.body, { error: "rate_limited" });
    setClientForTests(fake(["garbage"]));
    const bad = await call({ tip: "tip" }, { ip: "8.8.8.8" });
    assert.deepEqual(bad.body, { error: "bad_output" });
  } finally { console.log = log; }
});
