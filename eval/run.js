// npm run eval [-- --model claude-haiku-5-5] [--runs 3] [--concurrency 3]
// Runs the 20 test claims through the same buildPrompt, normalize and checkTip the API route uses,
// plus claim 17 with both demo profiles on every run. Writes a CSV and a full JSON log to eval/results/,
// and eval/results/latest.json, which the build publishes for How it works › Methodology.
import Anthropic from "@anthropic-ai/sdk";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLAIMS, DEMO_IDS, DEMO_PROFILES, FIT, FLAGS, CATS, GUARD_RE, DEFAULT_MODEL, checkTip, unsupportedFigures } from "../lib/verity.js";
import { sourceById } from "../lib/sources.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, dflt) => { const i = args.indexOf("--" + name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const MODEL = arg("model", process.env.VERITY_MODEL || DEFAULT_MODEL);
const RUNS = Number(arg("runs", 3));
const CONCURRENCY = Number(arg("concurrency", 3));
const SEEN_IN_PROMPT = [1]; // claim 1 is the prompt's own worked example
const SHORT = { well_supported: "Well supported", mixed: "Mixed", not_supported: "Not supported", promotional: "Promotional" };

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN){
  console.error("Set ANTHROPIC_API_KEY in .env (see .env.example), then run npm run eval again.");
  process.exit(1);
}
const client = new Anthropic();

function jobs(){
  const out = [];
  for (let run = 1; run <= RUNS; run++){
    for (const c of CLAIMS) out.push({ run, id: c.id, kind: "evidence", profile: null });
    out.push({ run, id: 17, kind: "fit_debt", profile: DEMO_PROFILES.debt.profile });
    out.push({ run, id: 17, kind: "fit_nodebt", profile: DEMO_PROFILES.nodebt.profile });
  }
  return out;
}

async function runJob(j){
  const c = CLAIMS.find(x => x.id === j.id);
  const req = { tip: c.text, source: "", sponsored: "", category: c.cat, catOverride: false, profile: j.profile };
  const t0 = Date.now();
  const rec = { run: j.run, id: j.id, kind: j.kind };
  try{
    const { data, raw, text, attempts } = await checkTip(client, req, { model: MODEL });
    rec.ms = Date.now() - t0;
    rec.attempts = attempts;
    rec.status = data.status;
    rec.output = data;
    rec.raw_text = text;
    if (data.status === "ok"){
      rec.verdict = data.evidence.verdict; rec.fit = data.fit.verdict; rec.flags = data.red_flags;
      rec.pro = data.ask_a_pro.needed; rec.who = data.ask_a_pro.who; rec.conf = data.confidence;
      rec.sources = data.sources;
      // Figures in why that no chosen source backs. normalize() drops those sentences before users see them,
      // so the raw flags count how often the model tried, and the shown flags should always be empty.
      const chosen = data.sources.map(sourceById).filter(Boolean);
      const rawWhy = raw && raw.evidence && typeof raw.evidence.why === "string" ? raw.evidence.why : "";
      rec.figure_flags_raw = unsupportedFigures(rawWhy, chosen, req.tip);
      rec.figure_flags_shown = unsupportedFigures(data.evidence.why, chosen, req.tip);
    }
    const m = text.match(GUARD_RE);
    rec.guard = m ? m[0] : "";
  }catch(e){
    rec.ms = Date.now() - t0;
    rec.error = (e && e.code) || "error";
    if (e && e.text) rec.raw_text = e.text;
    if (e && e.status) rec.upstream_status = e.status;
  }
  return rec;
}

async function pool(list, n, fn, onDone){
  const results = []; let i = 0;
  const worker = async () => { while (i < list.length){ const j = list[i++]; const r = await fn(j); results.push(r); onDone(r); } };
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

const csvCell = (x) => { const s = String(x == null ? "" : x); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

function summarize(R){
  const get = (run, id, kind) => R.find(r => r.run === run && r.id === id && r.kind === (kind || "evidence"));
  const runs = Array.from({ length: RUNS }, (_, i) => i + 1);
  const perRun = runs.map(run => CLAIMS.filter(c => (get(run, c.id) || {}).verdict === c.exp).length);
  const perRunUnseen = runs.map(run => CLAIMS.filter(c => !SEEN_IN_PROMPT.includes(c.id) && (get(run, c.id) || {}).verdict === c.exp).length);
  const consistency = DEMO_IDS.map(id => { const v = runs.map(run => (get(run, id) || {}).verdict); return { id, verdicts: v, same: !!v[0] && v.every(x => x === v[0]) }; });
  const askPro = [12, 13].map(id => ({ id, hits: runs.filter(run => (get(run, id) || {}).pro === true).length }));
  const fitSwitch = runs.map(run => { const a = get(run, 17, "fit_debt"), b = get(run, 17, "fit_nodebt"); return { run, debt: a && a.fit, nodebt: b && b.fit, changed: !!(a && b && a.fit && b.fit && a.fit !== b.fit) }; });
  const guard = R.filter(r => r.guard);
  const errors = R.filter(r => r.error);
  const ms = R.filter(r => !r.error).map(r => r.ms);
  const avgMs = ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0;
  const sorted = ms.slice().sort((a, b) => a - b);
  const p90Ms = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] : 0;
  const pass = perRun.every(n => n >= 17) && guard.length === 0;
  // A run is consistent when every claim got the verdict most runs gave it.
  const majority = (id) => { const c = {}; runs.forEach(run => { const v = (get(run, id) || {}).verdict; if (v) c[v] = (c[v] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a])[0]; };
  const runsConsistent = runs.filter(run => CLAIMS.every(c => (get(run, c.id) || {}).verdict === majority(c.id))).length;
  const withSources = (id) => runs.map(run => ((get(run, id) || {}).sources || []).length > 0);
  const sourcesEvery = CLAIMS.filter(c => withSources(c.id).every(Boolean)).length;
  const sourcesAny = CLAIMS.filter(c => withSources(c.id).some(Boolean)).length;
  const figureRaw = R.filter(r => r.figure_flags_raw && r.figure_flags_raw.length);
  const figureShown = R.filter(r => r.figure_flags_shown && r.figure_flags_shown.length);
  return { get, runs, perRun, perRunUnseen, consistency, askPro, fitSwitch, guard, errors, avgMs, p90Ms, pass,
    runsConsistent, sourcesEvery, sourcesAny, figureRaw, figureShown };
}

function toCSV(R, s){
  const rows = [["#", "category", "claim", "expected", ...s.runs.map(r => "run " + r), "correct out of " + RUNS, "red flags", "ask a pro", "confidence", "guardrail review", "sources", "figure flags", "claim summary", "why"]];
  for (const c of CLAIMS){
    const rs = s.runs.map(run => s.get(run, c.id));
    const cell = (r) => !r ? "" : r.error ? "error:" + r.error : r.status !== "ok" ? r.status : SHORT[r.verdict];
    const r1 = rs.find(r => r && r.output && r.output.status === "ok") || {};
    const o = r1.output || {};
    rows.push([
      c.id, CATS[c.cat], c.text, SHORT[c.exp], ...rs.map(cell),
      rs.filter(r => r && r.verdict === c.exp).length + "/" + RUNS,
      (r1.flags || []).map(f => FLAGS[f]).join("; "),
      rs.filter(r => r && r.pro).length + "/" + RUNS + (r1.who && r1.who !== "none" ? " (" + r1.who + ")" : ""),
      rs.map(r => (r && r.conf) || "-").join("/"),
      rs.filter(r => r && r.guard).map(r => "run " + r.run + ": " + r.guard).join("; "),
      rs.map(r => "run " + (r ? r.run : "?") + ": " + ((r && r.sources && r.sources.length) ? r.sources.join(" + ") : "none")).join("; "),
      rs.filter(r => r && r.figure_flags_raw && r.figure_flags_raw.length).map(r => "run " + r.run + ": " + r.figure_flags_raw.join(", ") + (r.figure_flags_shown.length ? " (SHOWN)" : " (removed)")).join("; "),
      o.claim_summary || "", (o.evidence && o.evidence.why) || ""
    ]);
  }
  for (const kind of ["fit_debt", "fit_nodebt"]){
    const rs = s.runs.map(run => s.get(run, 17, kind));
    const label = kind === "fit_debt" ? DEMO_PROFILES.debt.label : DEMO_PROFILES.nodebt.label;
    const r1 = rs.find(r => r && r.output && r.output.status === "ok") || {};
    rows.push([
      17, "Money", "Fit check: " + label, "fit changes",
      ...rs.map(r => !r ? "" : r.error ? "error:" + r.error : FIT[r.fit] ? FIT[r.fit].label : r.status),
      "", "", "", "", rs.filter(r => r && r.guard).map(r => "run " + r.run + ": " + r.guard).join("; "),
      "", "", "", (r1.output && r1.output.fit && r1.output.fit.reason) || ""
    ]);
  }
  return rows.map(r => r.map(csvCell).join(",")).join("\n") + "\n";
}

const list = jobs();
console.log(`Verity eval: ${CLAIMS.length} claims x ${RUNS} runs + claim 17 fit checks = ${list.length} calls, model ${MODEL}, concurrency ${CONCURRENCY}`);
const started = new Date();
let done = 0;
const R = await pool(list, CONCURRENCY, runJob, (r) => {
  done++;
  const tag = r.error ? "ERROR " + r.error : r.kind === "evidence" ? (SHORT[r.verdict] || r.status) : "fit " + (r.fit || r.status);
  process.stdout.write(`\r  ${done}/${list.length}  run ${r.run} #${r.id} ${r.kind}: ${tag}`.padEnd(80));
});
process.stdout.write("\n");
R.sort((a, b) => a.run - b.run || a.id - b.id || a.kind.localeCompare(b.kind));
const s = summarize(R);

const stamp = started.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = path.join(here, "results");
await mkdir(dir, { recursive: true });
const csvPath = path.join(dir, `${stamp}.csv`), jsonPath = path.join(dir, `${stamp}.json`);
await writeFile(csvPath, toCSV(R, s));
const { get, ...summary } = s;
await writeFile(jsonPath, JSON.stringify({ model: MODEL, runs: RUNS, concurrency: CONCURRENCY, started: started.toISOString(), finished: new Date().toISOString(), summary, results: R }, null, 1));
// The published summary. Scores are the lowest run, so the site never shows a best case.
const modelName = MODEL.replace(/^claude-/, "Claude ").replace(/-(\d+)-(\d+)$/, " $1.$2").replace(/(^|\s)([a-z])/g, (m, a, b) => a + b.toUpperCase());
const latest = {
  model: MODEL, model_name: modelName, date: started.toISOString().slice(0, 10), runs: RUNS,
  per_run: s.perRun, per_run_unseen: s.perRunUnseen,
  score_all: Math.min(...s.perRun), score_unseen: Math.min(...s.perRunUnseen),
  runs_consistent: s.runsConsistent, demo_consistent: s.consistency.filter(c => c.same).length, demo_total: s.consistency.length,
  guardrail_breaks: s.guard.length, ask_pro: s.askPro, avg_ms: s.avgMs,
  fit_changes: s.fitSwitch.filter(f => f.changed).length,
  sources_every_run: s.sourcesEvery, sources_any_run: s.sourcesAny, pass: s.pass
};
const latestPath = path.join(dir, "latest.json");
await writeFile(latestPath, JSON.stringify(latest, null, 1) + "\n");

const line = (k, v) => console.log("  " + k.padEnd(34) + v);
console.log("\nSummary");
s.runs.forEach((run, i) => line(`Run ${run}`, `${s.perRun[i]}/20  (unseen claims: ${s.perRunUnseen[i]}/19)`));
line("Pass (17/20 every run, 0 guardrail)", s.pass ? "PASS" : "FAIL");
line("Guardrail flags to review", String(s.guard.length) + (s.guard.length ? "  " + s.guard.map(r => `#${r.id} run ${r.run} "${r.guard}"`).join(", ") : ""));
line("Demo consistency (1,14,17,9,20)", s.consistency.filter(c => c.same).length + "/5" + s.consistency.filter(c => !c.same).map(c => `  #${c.id}: ${c.verdicts.join("/")}`).join(""));
s.askPro.forEach(a => line(`Ask a pro on #${a.id}`, `${a.hits}/${RUNS}`));
line("Claim 17 fit changes", s.fitSwitch.filter(f => f.changed).length + `/${RUNS}  ` + s.fitSwitch.map(f => `${f.debt}->${f.nodebt}`).join(", "));
line("Errors", String(s.errors.length) + (s.errors.length ? "  " + s.errors.map(r => `#${r.id} run ${r.run} ${r.error}`).join(", ") : ""));
line("Latency", `avg ${(s.avgMs / 1000).toFixed(1)}s, p90 ${(s.p90Ms / 1000).toFixed(1)}s`);
line("Runs consistent", `${s.runsConsistent}/${RUNS}`);
line("Claims with a vetted source", `${s.sourcesEvery}/20 in every run, ${s.sourcesAny}/20 in at least one`);
line("Unsourced figures in why", `${s.figureRaw.length} from the model, ${s.figureShown.length} shown to users` + (s.figureRaw.length ? "  " + s.figureRaw.map(r => `#${r.id} run ${r.run} ${r.figure_flags_raw.join(", ")}`).join("; ") : ""));
const misses = [];
for (const c of CLAIMS) for (const run of s.runs){ const r = s.get(run, c.id); if (!r || r.verdict !== c.exp) misses.push(`#${c.id} run ${run}: expected ${SHORT[c.exp]}, got ${r ? (r.error ? "error " + r.error : SHORT[r.verdict] || r.status) : "nothing"}`); }
if (misses.length){ console.log("\nMisses"); misses.forEach(m => console.log("  " + m)); }
console.log(`\nWrote ${path.relative(process.cwd(), csvPath)}, ${path.relative(process.cwd(), jsonPath)} and ${path.relative(process.cwd(), latestPath)}`);
process.exitCode = s.pass ? 0 : 1;
