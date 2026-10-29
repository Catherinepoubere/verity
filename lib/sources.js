// Curated source library. Every verdict's sources, key figure and quotes come from here,
// never from the model (BRIEF guardrail 4). Catherine checks each entry by hand against the
// live page; only entries with verified: true are sent to the model or rendered.
// Drafts waiting for her check are listed in eval/sources-to-verify.md.
//
// finding is an exact quote or an exact figure from the page. A finding wrapped in curly
// quotes renders in italic as a quote. figure and figure_label are optional.

const SOURCE_TYPES = ["Official data", "Regulator guidance", "Medical society guidance", "Systematic review", "Clinical trials", "Observational studies"];

const SOURCES = [
  /* ---------- seed entries, checked against the live pages ---------- */
  {
    id: "fed-g19-card-rates", org: "Federal Reserve", type: "Official data", date: "2026 Q1",
    title: "Consumer Credit, G.19", url: "https://www.federalreserve.gov/releases/g19/",
    finding: "Average interest rate on credit card accounts assessed interest: 21.52%.",
    figure: "21.5%", figure_label: "Average card rate when interest is charged",
    categories: ["money"], verified: true
  },
  {
    id: "sec-pay-high-interest-debt", org: "U.S. SEC", type: "Regulator guidance", date: "2022",
    title: "Investor Bulletin, Investor.gov",
    url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/investor-bulletin-top-10-investment-tips-college-students",
    finding: "“No investment strategy consistently pays off as well as, or with less risk than, eliminating high interest debt.”",
    // From the approved Verdict.html mockup, where it fills the second key-figure column for claim 17.
    figure: "Not guaranteed", figure_label: "Investment returns, in any year",
    categories: ["money"], verified: true
  },
  {
    id: "sec-crypto-guaranteed-returns", org: "U.S. SEC", type: "Regulator guidance", date: "2021",
    title: "Investor Alert, Investor.gov",
    url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/digital-asset-and-crypto-investment-scams-investor-alert",
    finding: "“Promises of high investment returns with little or no risk are a classic warning sign of fraud.”",
    categories: ["money"], verified: true
  },
  {
    id: "aad-cloudy-days", org: "American Academy of Dermatology", type: "Medical society guidance", date: "current",
    title: "Common sunscreen mistakes, AAD", url: "https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/common-sunscreen-mistakes",
    finding: "“Even on cloudy days, up to 80% of UV rays can penetrate your skin.”",
    figure: "Up to 80%", figure_label: "UV rays that reach skin on cloudy days",
    categories: ["beauty"], verified: true
  },
  {
    id: "aad-sunscreen-safety", org: "American Academy of Dermatology", type: "Medical society guidance", date: "2019",
    title: "AAD statement on sunscreen safety, Newswise", url: "https://www.newswise.com/articles/american-academy-of-dermatology-statement-on-the-safety-of-sunscreen2",
    finding: "The FDA has not “concluded that any of the sunscreen ingredients sold in the U.S. are unsafe,” and the study’s authors “concluded that the public should continue to use sunscreen.”",
    categories: ["beauty"], verified: true
  },
  /* ---------- drafts: verified: false until Catherine checks them (eval/sources-to-verify.md) ---------- */
  {
    id: "aad-anyone-skin-cancer", org: "American Academy of Dermatology", type: "Medical society guidance", date: "current",
    title: "Sunscreen FAQs, AAD", url: "https://www.aad.org/media/stats-sunscreen",
    finding: "“Anyone can get skin cancer, regardless of age, gender, or skin tone.”",
    categories: ["beauty"], verified: false
  },
  {
    id: "aad-daily-sunscreen", org: "American Academy of Dermatology", type: "Medical society guidance", date: "current",
    title: "Sunscreen FAQs, AAD", url: "https://www.aad.org/media/stats-sunscreen",
    finding: "“You should apply sunscreen every day on skin not covered by clothing if you will be outside.”",
    categories: ["beauty"], verified: false
  },
  {
    id: "aad-toothpaste-acne", org: "American Academy of Dermatology", type: "Medical society guidance", date: "current",
    title: "Adult acne treatment dermatologists recommend, AAD", url: "https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment",
    finding: "“Keep your toothpaste for your teeth and rely on clinically proven acne-fighting ingredients like adapalene, benzoyl peroxide, and salicylic acid to treat your adult acne.”",
    categories: ["beauty"], verified: false
  },
  {
    id: "aad-retinoid-sun", org: "American Academy of Dermatology", type: "Medical society guidance", date: "current",
    title: "Retinoid or retinol?, AAD", url: "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol",
    finding: "“Because retinoids can make skin more sensitive to sun, Dr. Alster advises using it only at night and always using sun protection during the day, which includes seeking shade, wearing sun-protective clothing, such as a wide-brimmed hat, and applying sunscreen to all skin not covered by clothing.”",
    categories: ["beauty"], verified: false
  },
  {
    id: "nccih-detox", org: "NIH, NCCIH", type: "Systematic review", date: "2025",
    title: "Detoxes and cleanses: what you need to know, NCCIH", url: "https://www.nccih.nih.gov/health/detoxes-and-cleanses-what-you-need-to-know",
    finding: "“A 2015 review concluded that there was no compelling research to support the use of “detox” diets for weight management or eliminating toxins from the body.”",
    categories: ["wellness"], verified: false
  },
  {
    id: "cdc-sleep-hours", org: "CDC", type: "Official data", date: "2024",
    title: "About Sleep, CDC", url: "https://www.cdc.gov/sleep/about/index.html",
    finding: "Recommended sleep for adults 18 to 60 years: 7 or more hours.",
    figure: "7+ hours", figure_label: "Sleep adults 18 to 60 need each night",
    categories: ["wellness"], verified: false
  },
  {
    id: "cdc-some-activity", org: "CDC", type: "Official data", date: "2023",
    title: "Adult activity: an overview, CDC", url: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
    finding: "“Some physical activity is better than none.”",
    categories: ["wellness"], verified: false
  },
  {
    id: "cdc-strength-days", org: "CDC", type: "Official data", date: "2023",
    title: "Adult activity: an overview, CDC", url: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
    finding: "“Adults also need 2 days of muscle-strengthening activity each week.”",
    figure: "2 days", figure_label: "Muscle-strengthening activity adults need each week",
    categories: ["wellness"], verified: false
  },
  {
    id: "paluch-steps-2022", org: "Lancet Public Health", type: "Observational studies", date: "2022",
    title: "Daily steps and all-cause mortality, PMC", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9289978/",
    finding: "“Taking more steps per day was associated with a progressively lower risk of all-cause mortality, up to a level that varied by age.”",
    categories: ["wellness"], verified: false
  },
  {
    id: "plos-mouth-taping-2025", org: "PLOS One", type: "Systematic review", date: "2025",
    title: "Mouth taping: a systematic review, PMC", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12094774/",
    finding: "“Based on the data presented by these 10 different studies, it seems that there is a potentially serious risk of harm for individuals indiscriminately practicing this trend.”",
    categories: ["wellness"], verified: false
  },
  {
    id: "cfpb-own-credit-report", org: "CFPB", type: "Regulator guidance", date: "current",
    title: "Does requesting my credit report hurt my credit score?, CFPB", url: "https://www.consumerfinance.gov/ask-cfpb/does-requesting-my-credit-report-hurt-my-credit-score-en-1229/",
    finding: "“No, requesting your credit report does not hurt your credit score.”",
    categories: ["money"], verified: false
  },
  {
    id: "cfpb-emergency-fund", org: "CFPB", type: "Regulator guidance", date: "current",
    title: "An essential guide to building an emergency fund, CFPB", url: "https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/",
    finding: "“Setting up a dedicated savings or emergency fund is one essential way to protect yourself, and it’s one of the first steps you can take to start saving.”",
    categories: ["money"], verified: false
  }
];

const byId = new Map(SOURCES.map(s => [s.id, s]));
function sourceById(id){ const s = byId.get(id); return s && s.verified === true ? s : null; }
// Verified entries for a category, plus any tagged for every category. With no category, all verified entries.
function verifiedSources(category){
  return SOURCES.filter(s => s.verified === true && (!category || category === "other" || s.categories.includes(category)));
}

export { SOURCES, SOURCE_TYPES, sourceById, verifiedSources };
