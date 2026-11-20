/** Single source of truth for plans and size limits (used by pricing, docs, FAQ and home pages).
 *  Prices are USD per month and take effect when billing starts; everything is free during the open beta. */

export interface Plan {
  id: "starter" | "standard" | "pro";
  name: string;
  priceMonthly: number;
  questions: number;
  maxFileMb: number;
  approxRows: string;
  datasets: number;
  tagline: string;
}

export const PLANS: Plan[] = [
  { id: "starter", name: "Starter", priceMonthly: 3.66, questions: 100, maxFileMb: 10, approxRows: "about 120,000 rows", datasets: 3, tagline: "Small files and occasional questions" },
  { id: "standard", name: "Standard", priceMonthly: 9.13, questions: 300, maxFileMb: 50, approxRows: "about 600,000 rows", datasets: 10, tagline: "Regular analysis of mid-sized files" },
  { id: "pro", name: "Pro", priceMonthly: 28.62, questions: 1000, maxFileMb: 100, approxRows: "about 1.2 million rows", datasets: 25, tagline: "Large files and heavy daily use" },
];

export const usd = (n: number) => `$${n.toFixed(2)}`;
export const perQuestion = (p: Plan) => `$${(p.priceMonthly / p.questions).toFixed(3)}`;

export interface SizeRow {
  upTo: string;
  rows: string;
  stored: string;
  prep: string;
  plan: Plan["name"];
}

/** From measured runs of the real pipeline (CSV 0.8 / 8.4 / 43 / 85 MB for 10k / 100k / 500k / 1M rows).
 *  Prep times are estimates for a typical cloud server and will vary. */
export const SIZE_TABLE: SizeRow[] = [
  { upTo: "1 MB", rows: "about 12,000", stored: "about 1 MB", prep: "under 2 seconds", plan: "Starter" },
  { upTo: "10 MB", rows: "about 120,000", stored: "about 12 MB", prep: "2 to 5 seconds", plan: "Starter" },
  { upTo: "50 MB", rows: "about 600,000", stored: "about 60 MB", prep: "10 to 20 seconds", plan: "Standard" },
  { upTo: "100 MB", rows: "about 1.2 million", stored: "about 120 MB", prep: "20 to 40 seconds", plan: "Pro" },
];

export const PRICING_SUMMARY =
  "Starter $3.66, Standard $9.13 and Pro $28.62 per month, chosen by the size of your largest file. Everything is free during the open beta.";
