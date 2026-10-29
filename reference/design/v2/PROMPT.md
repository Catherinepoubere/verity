# Verity v2 redesign: Claude Code prompt

Before you paste this: unzip `verity-design-v2.zip` into the repo so the six files sit at `reference/design/v2/` (Welcome, Check, Verdict, NoDebt, Booth, Language `.html`). They are plain HTML: double-click any of them to see the screen in a browser.

---

Read BRIEF.md and every file in reference/design/v2/ before writing code. This is an approved redesign of the live app. Where this prompt or reference/design/v2/ disagrees with BRIEF.md sections 4 and 5, this prompt wins. Everything else in BRIEF.md still holds: colors, fonts, grain, foil, square controls, text-only nav, voice rules (no exclamation marks, no em dashes, no emoji), storage, API, guardrails, section 11 scope. Do not rename code identifiers or API fields: `tip` stays `tip` in code and JSON. Only user-facing text changes.

The v2 files are plain, standalone HTML mockups. Open them in a browser to see each screen, and treat their inline styles as the exact spec. Language.html is the source of truth for copy.

## 1. Voice: the warm advisor

Verity sounds like a trusted advisor: calm, exact and on your side. It leads with the evidence, then talks to you about your situation. Be warm, never cute: no playful phrasing and no cold one-word verdicts. Never use the word "tip" in the interface. Replace these strings everywhere they appear:

| Where | New text |
|---|---|
| Welcome headline | Keep the live app's headline: Less *noise*. More *truth*, tailored to *you*. ("you." in italic foil) |
| Welcome line | Verity reviews the skincare, wellness and money advice in your feed against the evidence, and against your life. |
| Welcome hero button | Review advice |
| Welcome secondary link | Set up your profile, 60 seconds |
| Welcome dateline (top right) | Skincare · Wellness · Money |
| Welcome footer | Your proof, not their posts. Not medical, legal or financial advice. |
| Check heading | What advice would you like reviewed? |
| Check input label | Paste it here, as you saw it |
| Category line | Category: Money (with a "change" link that opens the segmented control) |
| Examples label | Or start with an example |
| Submit button | Review this advice |
| Optional details link | Add source and sponsorship (optional) |
| Booth heading | What advice would you like reviewed? |
| Booth profile names | No profile · Maya, in debt · Maya, debt free |
| Booth switch label | Same advice, different life. Switch profiles to see the fit change. |
| Loading text | Reading the evidence, then Thinking about your situation once evidence is in |
| Verdict section labels | The evidence · For your situation (For Maya's situation in booth mode) · A good place to start |
| First step text | Starts with an action verb in a gentle frame, such as "Start by listing each card…" (update the prompt's next_step instruction) |
| Save button | Save to My Proof (unchanged) |
| Trust link under every verdict | Methodology · tested on 20 claims, N of 20 correct (links to How it works › Methodology) |
| My Proof summary | 12 reviews. 3 worked for you. |
| Nav | Check · My Proof · Profile · How it works (unchanged) |

Remove "Yes." or "No." openers from the evidence and fit reasons: the headline already answers.

## 2. Verdict headline

Add `headline(evidence, fit)` in lib/verity.js and use it for the big verdict word (Newsreader Light, white on velvet, second sentence italic foil):

| | Well supported | Mixed evidence | Not supported |
|---|---|---|---|
| For you | Supported. A good fit for you. | Mixed evidence. Could work for you. | Not supported. Better to skip this one. |
| Maybe for you | Supported. Possibly a fit for you. | Mixed evidence. Go carefully. | Not supported. Better to skip this one. |
| Not for you | Supported. Not the right fit for you. | Mixed evidence. Not the right fit for you. | Not supported. Better to skip this one. |
| Need profile | Supported. | Mixed evidence. | Not supported. Better to skip this one. |

Promotional, any fit: "Promotional. Mainly selling something."
Sizes: 48px on phone, 84px on desktop, two lines (break after the first sentence).
Under it, one mono 12 meta line: `<evidence label> · <fit label> · <confidence> confidence`, using the exact BRIEF vocabulary.

## 3. The evidence × fit chart (replaces the two separate scales on the verdict)

One chart on the velvet panel. Evidence runs left to right, fit runs bottom to top. Match Verdict.html exactly:
- Plot box: 240px tall on phone, 300px on desktop, 1px border rgba(255,255,255,0.14), a vertical and a horizontal center line at rgba(233,204,116,0.3). No corner labels or quadrant names.
- Fit labels in a 78px column to the left, top to bottom: For you · Maybe for you · Not for you. Evidence labels below: Not supported · Mixed evidence · Well supported. Mono 11 (13 on desktop), #A9C2B6; the active label is white 500.
- Marker: 16px foil circle (22px on desktop), halo `0 0 0 5px rgba(233,204,116,0.18), 0 0 28px rgba(233,204,116,0.55)`. X position: not supported 7%, mixed 50%, well supported 93%. Y position from top: for you 7%, maybe 50%, not for you 93%.
- Need profile: marker sits at the vertical center, fit labels drop to 40% opacity, and a gold-underlined link under the chart reads "Add your profile to check fit".
- Promotional: the plot drops to 30% opacity, the marker sits at x 100% on the vertical center, and the note reads "Mainly selling something."
- `role="img"` with an aria-label such as "Evidence: well supported. Fit: for you."
- My Proof keeps the existing 96px mini scale (evidence only).

## 4. The profile switch (the booth moment)

When the booth profile changes and the same claim is re-reviewed:
- Leave a 12px ghost ring (1px solid rgba(233,204,116,0.6)) at the old marker position and draw a 1px dashed foil line (rgba(233,204,116,0.55)) from old to new.
- Animate the marker's top/left to the new position in 600ms ease-out. Skip the animation under prefers-reduced-motion (the ghost and line still show).
- Above the fit reason, show one mono 12 line in #E9CC74: "Updated for <Maya | you>: <plain change>, so this <now applies | no longer applies | may apply>." Example: "Updated for Maya: no card debt, so this no longer applies." Work out the change by diffing the two profiles over `fit.profile_fields_used`, and use plain phrases (card debt / no card debt, savings / no savings yet). Pick the ending from the new fit verdict. If nothing in the used fields differs, omit the line.
- See NoDebt.html for the end state.

## 5. Screens

- **Welcome** (Welcome.html): full velvet screen. The 260px decorative chart at the top shows faint italic example claims as 6px dots in #8FAE9F, with one foil marker lit at top right ("pay off the card first"). Mark it aria-hidden. It is static: no new motion.
- **Check** (Check.html): must fit above the fold at 390×844 with the nav showing. Order: wordmark, heading, input, category line, three examples (hairline list), submit, optional details link. Source and sponsored live behind the optional link, collapsed by default.
- **Verdict, phone** (Verdict.html): velvet panel with dateline, quoted claim, headline, meta line, chart, and in booth mode the profile switch. Then the ivory section: The evidence (reason, key figure, sources, evidence base; see section 7), hairline, For your situation (reason + "Based on:" line), hairline, A good place to start at 21 Light, buttons, trust link, disclaimer. Red flags, ask a pro and the error states keep their current rendering, retitled to match the voice.
- **Verdict, desktop ≥1024px** (Booth.html): velvet panel 840px wide on the left (claim 24 italic, headline 84, meta, chart filling the panel bottom). Ivory column on the right: profile switch, The evidence, For Maya's situation / For your situation, then the Methodology row pinned to the bottom (four mono figures: N/20 all claims, N/19 unseen claims, N/3 runs consistent, N guardrail breaks, plus model and date).
- **How it works:** add a "Methodology" section: a hairline table in IBM Plex Mono with runs, score per run out of 20, score on the 19 unseen claims, demo-claim consistency, guardrail violations, ask-a-pro checks, average latency, model and date. Read the numbers from eval/results/latest.json, which `npm run eval` writes and the build copies to public/. Never hardcode numbers. If the file is missing, hide the row and the trust line's score.

## 6. Sharing

Add og:title "Verity", og:description "Less noise. More truth, tailored to you.", og:image, and twitter:card summary_large_image. Make a 1200×630 public/og.png: velvet green, foil wordmark, the Welcome headline in Newsreader Light, and a small foil chart marker.

## 7. Sources and data behind every answer

Every verdict shows the evidence it rests on: a key figure, up to 3 vetted sources and an evidence-base line. BRIEF guardrail 4 still holds: the model never writes a citation, URL, statistic or quote. All source text comes from a curated library that Catherine has checked by hand. This is a static library, not the "live source citations" in section 11.

**Library: `lib/sources.js`.** Export `SOURCES`, an array of entries:
```js
{ id, org, type, date, title, url, finding, figure, figure_label, categories: [], verified: true }
```
- `type` is one of: Official data · Regulator guidance · Medical society guidance · Systematic review · Clinical trials · Observational studies.
- `finding` is an exact quote or an exact figure from the page. `figure` and `figure_label` are optional.
- Only `verified: true` entries are ever sent to the model or rendered.

Seed it with these five entries, checked against the live pages on Oct 29, 2026:

| id | org · type · date | finding | url |
|---|---|---|---|
| `fed-g19-card-rates` | Federal Reserve · Official data · 2026 Q1 | Average interest rate on credit card accounts assessed interest: 21.52%. figure "21.5%", figure_label "Average card rate when interest is charged" | https://www.federalreserve.gov/releases/g19/ |
| `sec-pay-high-interest-debt` | U.S. SEC · Regulator guidance · 2022 | "No investment strategy consistently pays off as well as, or with less risk than, eliminating high interest debt." | https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/investor-bulletin-top-10-investment-tips-college-students |
| `sec-crypto-guaranteed-returns` | U.S. SEC · Regulator guidance · 2021 | "Promises of high investment returns with little or no risk are a classic warning sign of fraud." | https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/digital-asset-and-crypto-investment-scams-investor-alert |
| `aad-cloudy-days` | American Academy of Dermatology · Medical society guidance · current | "Even on cloudy days, up to 80% of UV rays can penetrate your skin." figure "Up to 80%", figure_label "UV rays that reach skin on cloudy days" | https://www.aad.org/sun-protection/common-sunscreen-mistakes |
| `aad-sunscreen-safety` | American Academy of Dermatology · Medical society guidance · 2019 | The FDA has not "concluded that any of the sunscreen ingredients sold in the U.S. are unsafe," and the study's authors "concluded that the public should continue to use sunscreen." | https://www.newswise.com/articles/view/713311/ |

Before the booth, re-open each URL and confirm the quote is still there. If the AAD URL redirects, use the final address.

**Covering the other claims.** For each of the 20 eval claims without a seed source, draft up to 2 entries from government agencies, medical societies, or peer-reviewed systematic reviews only. Never use brands, creators, blogs or news sites. Mark every drafted entry `verified: false` and list them in `eval/sources-to-verify.md` with the URL and exact quote, so Catherine can check and flip them. Unverified entries never render.

**Prompt and output.**
- Append the verified library to `buildPrompt()` as a numbered list of `id`, org, type, finding and categories, filtered to the detected category.
- Instruct the model: "Choose up to 3 source ids from this list that directly support your evidence verdict. Do not cite anything else. If none fits, return an empty list. Use a number in `why` only if it appears in a chosen source's finding."
- Add `"sources": ["id", ...]` and `"evidence_base": "short phrase, such as official data and regulator guidance"` to the output JSON.
- In `normalize()`: drop unknown or unverified ids, remove duplicates and cap at 3. If `why` contains a percentage or dollar figure that doesn't appear in a chosen source's finding, remove that sentence.

**UI (match Verdict.html and Booth.html).** In the Evidence section, under the reason:
1. **Key figure:** a two-column row between hairlines. Show the first chosen source's `figure` in Newsreader Light 44 green, with `figure_label` and `org · date` in mono. When the claim is a comparison, as in claim 17, the second column can hold a second figure or a short serif phrase from a second source. Skip the row if no source has a figure.
2. **Sources · N vetted:** a hairline list. Each row shows `org · type · date` in mono 11, the finding in Newsreader 16 (italic when it's a quote), and the `title ↗` as a gold-underlined mono link opening in a new tab with `rel="noopener"`.
3. **Evidence base:** one mono 12 line, `Evidence base: <evidence_base> · <confidence> confidence`.
4. **No source:** if no source was chosen, show "Basis: <basis>" as today, plus "No vetted source on file for this claim yet."

On desktop, the key figure sits left of the reason at 52px, and the sources become single mono rows with the link on the right (Booth.html). Copy card includes the source titles and URLs. My Proof stores the source ids.

## 8. Done means

- Run `npm run eval` and confirm it still passes (17 of 20 on every run, zero guardrail violations, claim 17's fit changes). Report the table.
- Screenshot at 390×844 and 1440×900: Welcome, Check, verdict for claim 17 under "Maya, in debt", then the same claim after switching to "Maya, debt free" (ghost, trail and "Updated for Maya" line visible), and claim 1 with no profile. Put them side by side with reference/design/v2/ and list every difference you couldn't match.
- Search the built UI for the word "tip" in visible text and remove any you find.
- Extend the eval: record the chosen source ids per run. Add a "sources" column to the CSV and flag any verdict whose `why` has a figure not found in its sources. Report how many of the 20 claims render at least one vetted source.
- Confirm claims 1, 14 and 17 each render their seed sources and key figure.
- Commit on a branch and open a PR; don't merge to main until I've looked at the screenshots.
