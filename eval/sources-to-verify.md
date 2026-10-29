# Sources to verify

Drafted entries in `lib/sources.js` with `verified: false`. They are never sent to the model or shown in the app until you open the page, confirm the quote word for word, and change the entry to `verified: true`.

Each quote below was copied from the live page on Oct 28, 2026 by downloading it and searching the text, not retyped. Check the type and date too: I picked the closest type from the six allowed, and "current" means the page shows no date.

## Seed entries (already verified: true): re-check before the booth

| id | Status on Oct 28, 2026 |
|---|---|
| `fed-g19-card-rates` | 21.52% is in the current G.19 table at [federalreserve.gov/releases/g19/current](https://www.federalreserve.gov/releases/g19/current/default.htm) under "Accounts assessed interest", 2026 Q1. The table now also shows **2026 Q2 at 22.15%**, so you may want to update the figure, finding and date. The finding is a description of a table row, not a sentence on the page. |
| `sec-pay-high-interest-debt` | Quote found word for word. |
| `sec-crypto-guaranteed-returns` | Quote found word for word. |
| `aad-cloudy-days` | Quote found word for word. The old URL redirects, so the library now uses the final address: https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/common-sunscreen-mistakes |
| `aad-sunscreen-safety` | Both quoted phrases found. The Newswise URL redirects, so the library now uses https://www.newswise.com/articles/american-academy-of-dermatology-statement-on-the-safety-of-sunscreen2 |

`sec-pay-high-interest-debt` also has `figure: "Not guaranteed"` and `figure_label: "Investment returns, in any year"`, copied from the approved Verdict.html mockup, where they fill the second key-figure column for claim 17. That text is not on the SEC page. Keep it, change it, or delete those two fields.

## Drafted entries (verified: false)

| Claim | id | Org · type · date | Exact quote | URL |
|---|---|---|---|---|
| 3. Darker skin tones don't need sunscreen | `aad-anyone-skin-cancer` | American Academy of Dermatology · Medical society guidance · current | "Anyone can get skin cancer, regardless of age, gender, or skin tone." | https://www.aad.org/media/stats-sunscreen |
| 2, 3, 6 (daily sunscreen) | `aad-daily-sunscreen` | American Academy of Dermatology · Medical society guidance · current | "You should apply sunscreen every day on skin not covered by clothing if you will be outside." | https://www.aad.org/media/stats-sunscreen |
| 4. Toothpaste on a pimple | `aad-toothpaste-acne` | American Academy of Dermatology · Medical society guidance · current | "Keep your toothpaste for your teeth and rely on clinically proven acne-fighting ingredients like adapalene, benzoyl peroxide, and salicylic acid to treat your adult acne." | https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment |
| 6. Retinoid users wear sunscreen | `aad-retinoid-sun` | American Academy of Dermatology · Medical society guidance · current | "Because retinoids can make skin more sensitive to sun, Dr. Alster advises using it only at night and always using sun protection during the day, which includes seeking shade, wearing sun-protective clothing, such as a wide-brimmed hat, and applying sunscreen to all skin not covered by clothing." | https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol |
| 8. Detox teas | `nccih-detox` | NIH, NCCIH · Systematic review · 2025 (page last updated March 2025; it cites a 2015 review) | "A 2015 review concluded that there was no compelling research to support the use of "detox" diets for weight management or eliminating toxins from the body." | https://www.nccih.nih.gov/health/detoxes-and-cleanses-what-you-need-to-know |
| 9. 7 hours of sleep | `cdc-sleep-hours` | CDC · Official data · 2024 | Table row: "Adult · 18–60 years · 7 or more hours". The finding is written as "Recommended sleep for adults 18 to 60 years: 7 or more hours." Figure "7+ hours". | https://www.cdc.gov/sleep/about/index.html |
| 10. 10,000 steps | `cdc-some-activity` | CDC · Official data · 2023 | "Some physical activity is better than none." | https://www.cdc.gov/physical-activity-basics/guidelines/adults.html |
| 10. 10,000 steps | `paluch-steps-2022` | Lancet Public Health · Observational studies · 2022 (meta-analysis of 15 cohorts) | "Taking more steps per day was associated with a progressively lower risk of all-cause mortality, up to a level that varied by age." | https://pmc.ncbi.nlm.nih.gov/articles/PMC9289978/ |
| 11. Strength training twice a week | `cdc-strength-days` | CDC · Official data · 2023 | "Adults also need 2 days of muscle-strengthening activity each week." Figure "2 days". | https://www.cdc.gov/physical-activity-basics/guidelines/adults.html |
| 13. Mouth taping | `plos-mouth-taping-2025` | PLOS One · Systematic review · 2025 | "Based on the data presented by these 10 different studies, it seems that there is a potentially serious risk of harm for individuals indiscriminately practicing this trend." | https://pmc.ncbi.nlm.nih.gov/articles/PMC12094774/ |
| 15. Checking your credit lowers it | `cfpb-own-credit-report` | CFPB · Regulator guidance · current | "No, requesting your credit report does not hurt your credit score." | https://www.consumerfinance.gov/ask-cfpb/does-requesting-my-credit-report-hurt-my-credit-score-en-1229/ |
| 18. Emergency fund | `cfpb-emergency-fund` | CFPB · Regulator guidance · current | "Setting up a dedicated savings or emergency fund is one essential way to protect yourself, and it's one of the first steps you can take to start saving." | https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/ |

The CDC pages blocked direct downloads, so their quotes came through a web reader. Check those two pages with extra care.

## No draft yet

| Claim | Why |
|---|---|
| 5. Lemon juice on dark spots | No AAD or government page found that addresses lemon juice. |
| 7. Beef tallow | No government, medical society or systematic review source found. |
| 12. Cold plunges cure anxiety | No suitable source found in this pass. |
| 16. Buy now, pay later | The CFPB page (https://www.consumerfinance.gov/ask-cfpb/will-a-buy-now-pay-later-bnpl-loan-impact-my-credit-scores-en-2117/) downloaded, but I couldn't pull a clean quote from it. Worth a manual look. |
| 19. Renting is throwing money away | Mixed by design. No single official source settles it. |
| 20. Make $5,000 a week course | The FTC's job-scams page (https://consumer.ftc.gov/articles/job-scams, March 2023) has a fitting warning, but it blocks direct downloads, so I couldn't copy the exact sentence. Copy it from the page. |
