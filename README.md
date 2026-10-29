# verity

**Less *noise*. More *truth*, tailored to *you*.**

Verity reviews the skincare, wellness and money advice in your feed against the evidence, and against your life. Paste some advice you saw, and Verity tells you what it claims, how well the evidence supports it (with vetted sources), any red flags, whether it fits your profile, and a good place to start. Fact-checkers ask "Is this true?" Verity also asks "Is this true for me?"

Built by Catherine Poubere for AfroTech 2026. Try booth mode at `/?booth=1`.

## How it works

```
public/index.html   the whole app: markup, CSS and client JS, no framework
api/check.js        POST /api/check, the only server code (Vercel function)
lib/verity.js       shared: prompt, normalize(), headline(), present(), verdict vocabularies, the 20 test claims, checkTip()
lib/sources.js      the curated source library: only verified: true entries reach the model or the page
eval/run.js         npm run eval
eval/sources-to-verify.md  drafted sources waiting for a hand check
scripts/build.js    publishes eval/results/latest.json to public/ for How it works › Methodology
scripts/og.html     source for public/og.png, the 1200x630 sharing image
dev-server.js       local server that serves public/ and the same API handler
reference/          the claude.ai prototype, design/ (the v1 mockups) and design/v2/ (the approved redesign and its PROMPT.md)
```

The browser sends the tip, a few optional details and only the profile fields you filled in to `/api/check`. The server screens for crisis wording (and shows the 988 Lifeline without calling the model), applies rate limits and a daily cap, then asks Claude for a JSON verdict. The prompt includes the verified entries from `lib/sources.js` for the detected category, and Claude may only cite them by id. The server parses the JSON and runs `normalize()` to enforce the verdict vocabulary and voice rules: it drops unknown or unverified source ids, and removes any sentence whose percentage or dollar figure isn't in a chosen source or the advice itself. It retries once on bad output, all within 25 seconds, then adds the headline and the full source entries before replying. The API route and the eval import the same `lib/verity.js`, so the eval measures exactly what users get.

Your profile and My Proof stay in your browser's `localStorage`. There are no accounts, analytics or tracking. The server never logs tip text or profile data, only status, latency and error codes.

## Design

The look comes from `reference/design/v2/`: ivory and velvet green, gold foil, Newsreader for reading and IBM Plex Mono for labels and controls, square controls and a text-only nav. Every verdict sits as a foil marker on one evidence × fit chart: evidence left to right, fit bottom to top. In booth mode, switching Maya's profile leaves a ghost ring and a dashed trail where the marker was. The voice is a warm advisor, and the interface never says "tip". On screens 960px and wider it switches to a top nav and split layouts: Welcome puts its static chart beside the headline, and from 1024px the Verdict keeps the velvet panel and chart on the left while you read the right (Booth.html). Light theme only.

## Run it locally

Needs Node 20 or later.

```bash
npm install
cp .env.example .env    # then add your ANTHROPIC_API_KEY
npm run dev             # http://localhost:3000 and http://localhost:3000/?booth=1
npm test                # offline tests with a fake Claude client, no key needed
```

Environment variables:

| Name | Default | Use |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Required. Server only, never sent to the browser. |
| `VERITY_MODEL` | `claude-sonnet-5-5` | Model for verdicts |
| `MAX_DAILY_CHECKS` | `1000` | After this many checks in a UTC day, the app shows "Verity is resting. Try again tomorrow." |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | none | Optional. Real rate limits and daily cap across serverless instances. Vercel KV's `KV_REST_API_URL` and `KV_REST_API_TOKEN` also work. |

## Run the eval

```bash
npm run eval                               # 20 claims x 3 runs, plus claim 17 with both demo profiles each run
npm run eval -- --model claude-haiku-5-5   # compare models
```

It writes `eval/results/<timestamp>.csv` and a full JSON log, then prints scores per run, the 17-of-20 pass bar, demo-claim consistency, ask-a-pro on claims 12 and 13, whether claim 17's fit changes between the two demo profiles, guardrail flags, latency, how many claims got a vetted source, and any figure in `why` that no chosen source backs. The CSV has a sources column per run and a figure-flags column.

It also writes `eval/results/latest.json`. Commit that file: `npm run build` (run by Vercel and `npm run dev`) copies it to `public/`, and How it works › Methodology and the trust line under every verdict read their numbers from it. The site shows the lowest run's score. Without the file, the Methodology section and the score stay hidden. The guardrail check is a regex for named brands, coins, funds, doses and diagnoses. A flagged row needs a human look; it is not automatically a violation.

**Disclosure:** claim 1 ("Chemicals in sunscreen are worse for you than a sunburn") is the prompt's own worked example, so the eval reports accuracy on all 20 claims and on the 19 claims the prompt has never seen.

## Latest results

Oct 29, 2026, v2 prompt and source library, second run after tightening the fit and citation rules. Full results: `eval/results/final.csv` and `final.json`.

| Model | Run 1 | Run 2 | Run 3 | Unseen (19) | Guardrail flags | Claim 17 fit changes | Avg latency |
|---|---|---|---|---|---|---|---|
| claude-sonnet-5-5 | 18/20 | 18/20 | 18/20 | 17/19 every run | 0 | 3/3 (for you to not for you) | 4.4 s (p90 5.0 s) |

**Pass.** Every run gave the same verdict on every claim. Demo claims were consistent 5/5, and ask-a-pro fired on claims 12 and 13 in 3/3 runs. No figure in `why` lacked a source.

- **Misses**, the same in all three runs:
  - **#7 beef tallow:** expected Mixed, got Not supported. The model judged "best for every skin type" as an overclaim.
  - **#16 buy now, pay later:** expected Not supported, got Mixed. The model credited the no-interest kernel.
- **Vetted sources:** 5 of 20 claims got one in every run, 6 in at least one. Most claims have no verified source yet; see `eval/sources-to-verify.md`.

## Deploy

1. Push this repo to a public GitHub repo named `verity`.
2. Create an Anthropic API key and set a monthly spend limit in the Console.
3. Import the repo in Vercel (framework preset: Other). Set `ANTHROPIC_API_KEY`, `VERITY_MODEL` and `MAX_DAILY_CHECKS`. Add Upstash Redis from the Vercel marketplace for rate limits.
4. Deploy, then test on a real phone over cellular data.
5. Make the QR code from `https://<your-domain>/?booth=1`.

## Known limits

- Verity uses AI, and AI can be wrong. Verdicts reflect mainstream expert guidance, which changes over time.
- Sources come from a small hand-checked library, not live search. Claims with no vetted source show the kind of authority instead, with "No vetted source on file for this claim yet." Re-check each source page before the booth (see `eval/sources-to-verify.md`).
- Without Upstash, rate limits and the daily cap are kept in memory per serverless instance, so they are approximate: a cold start resets them and parallel instances each count separately. The Anthropic Console spend limit is the hard backstop.
- Rate limits are per IP, so a booth crowd on one Wi-Fi network shares 10 checks a minute and 60 a day.
- No `temperature` setting: the brief asked for `temperature: 0`, but the current Claude API rejects sampling parameters, so verdicts can vary slightly between runs. The eval's consistency check measures this.
- The crisis screen is a keyword check plus the model's own `crisis` status. It is a safety net, not a crisis service.

## What's next

Deliberately out of scope for v1: screenshot or video upload, pasting TikTok or Instagram links, live source citations, creator track records, accounts and syncing, native apps, and spending impact.
