# verity

**Your proof, not their posts.**

Verity is a mobile web app that checks advice from social media against the evidence and against you. Paste a tip you saw about skincare, wellness or money, and Verity tells you what it claims, how well the evidence supports it, any red flags, whether it fits your profile, and a safer next step. Fact-checkers ask "Is this true?" Verity also asks "Is this true for me?"

Built by Catherine Poubere for AfroTech 2026. Try booth mode at `/?booth=1`.

## How it works

```
public/index.html   the whole app: markup, CSS and client JS, no framework
api/check.js        POST /api/check, the only server code (Vercel function)
lib/verity.js       shared: prompt, normalize(), verdict vocabularies, the 20 test claims, checkTip()
eval/run.js         npm run eval
dev-server.js       local server that serves public/ and the same API handler
reference/          the claude.ai prototype (behavior and copy) and design/ (the six screen mockups)
```

The browser sends the tip, a few optional details and only the profile fields you filled in to `/api/check`. The server screens for crisis wording (and shows the 988 Lifeline without calling the model), applies rate limits and a daily cap, then asks Claude for a JSON verdict. It parses the JSON, runs `normalize()` to enforce the verdict vocabulary and voice rules, and retries once on bad output, all within 25 seconds. The API route and the eval import the same `lib/verity.js`, so the eval measures exactly what users get.

Your profile and My Proof stay in your browser's `localStorage`. There are no accounts, analytics or tracking. The server never logs tip text or profile data, only status, latency and error codes.

## Design

The look comes from `reference/design/`: ivory and velvet green, gold foil, Newsreader for reading and IBM Plex Mono for labels and controls, square controls and a text-only nav. Every verdict sits as a foil marker on a scale, for evidence and for fit. v1 ships a light theme only.

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

It writes `eval/results/<timestamp>.csv` and a full JSON log, then prints scores per run, the 17-of-20 pass bar, demo-claim consistency, ask-a-pro on claims 12 and 13, whether claim 17's fit changes between the two demo profiles, guardrail flags and latency. The guardrail check is a regex for named brands, coins, funds, doses and diagnoses. A flagged row needs a human look; it is not automatically a violation.

**Disclosure:** claim 1 ("Chemicals in sunscreen are worse for you than a sunburn") is the prompt's own worked example, so the eval reports accuracy on all 20 claims and on the 19 claims the prompt has never seen.

## Latest results

Not run yet. Run `npm run eval` with production settings, copy the CSV to `eval/results/final.csv`, and fill in this section.

| Model | Run 1 | Run 2 | Run 3 | Unseen (19) | Guardrail flags | Claim 17 fit changes | Avg latency |
|---|---|---|---|---|---|---|---|
| claude-sonnet-5-5 | | | | | | | |

## Deploy

1. Push this repo to a public GitHub repo named `verity`.
2. Create an Anthropic API key and set a monthly spend limit in the Console.
3. Import the repo in Vercel (framework preset: Other). Set `ANTHROPIC_API_KEY`, `VERITY_MODEL` and `MAX_DAILY_CHECKS`. Add Upstash Redis from the Vercel marketplace for rate limits.
4. Deploy, then test on a real phone over cellular data.
5. Make the QR code from `https://<your-domain>/?booth=1`.

## Known limits

- Verity uses AI, and AI can be wrong. Verdicts reflect mainstream expert guidance, which changes over time.
- It names the kind of authority behind a verdict, not live sources, so it never invents a citation but also can't link you to one.
- Without Upstash, rate limits and the daily cap are kept in memory per serverless instance, so they are approximate: a cold start resets them and parallel instances each count separately. The Anthropic Console spend limit is the hard backstop.
- Rate limits are per IP, so a booth crowd on one Wi-Fi network shares 10 checks a minute and 60 a day.
- No `temperature` setting: the brief asked for `temperature: 0`, but the current Claude API rejects sampling parameters, so verdicts can vary slightly between runs. The eval's consistency check measures this.
- The crisis screen is a keyword check plus the model's own `crisis` status. It is a safety net, not a crisis service.

## What's next

Deliberately out of scope for v1: screenshot or video upload, pasting TikTok or Instagram links, live source citations, creator track records, accounts and syncing, native apps, and spending impact.
