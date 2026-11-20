# 10. Pricing and costs

The public site shows prices only. This internal page also explains how they were derived. The full working is in `Dataloom-Costing.pdf` in the project root.

## Plans (single source: `frontend/src/lib/pricing.ts`)

| Plan | Price per month | Questions | Largest file | Rows (about) | Datasets |
|------|----------------:|----------:|-------------:|-------------:|---------:|
| Starter | $3.66 | 100 | 10 MB | 120,000 | 3 |
| Standard | $9.13 | 300 | 50 MB | 600,000 | 10 |
| Pro | $28.62 | 1,000 | 100 MB | 1.2 million | 25 |

Everything is free during the open beta. Plans are not enforced in the code yet (see [09-known-gaps.md](09-known-gaps.md)).

## What costs money

1. **Gemini calls.** Each question makes about two calls (write the code, then explain the result). A chart reply is a further call. Gemini 3.5 Flash is priced at $1.50 per million input tokens and $9.00 per million output tokens. Thinking tokens count as output; their volume is an assumption until measured.
2. **Compute.** Running the analysis costs a fraction of a cent per question.
3. **Storage.** About 1.21 times the CSV size (original plus Parquet), assumed at $0.10 per GB-month and doubled for backup.
4. **Servers and platform.** Hosting, database, domain, email, monitoring: about $30 a month lean, $60 managed.
5. **Payment fees.** Stripe at 2.9% plus $0.30 per charge, with extra for international cards and currency conversion.

## Key finding

AI cost depends on the **number of columns**, not the number of rows, because the AI sees a description of the columns and not the data. A 1 MB file and a 100 MB file cost about the same per question. Larger files cost more only for storage and for the time to prepare them.

## Measured on the real pipeline

| CSV size | Rows | Prep time | Peak memory while loading | Typical question |
|---------:|-----:|----------:|--------------------------:|-----------------:|
| 0.8 MB | 10,000 | 0.6 s | 120 MB | about 0.7-1.2 s |
| 8.4 MB | 100,000 | 1.7 s | 215 MB | about 0.7-0.8 s |
| 43 MB | 500,000 | 8.3 s | 625 MB | about 0.8-0.9 s |
| 85 MB | 1,000,000 | 17.0 s | 1,079 MB | about 0.8-1.0 s |

(14 columns; one machine; numbers will vary on a cloud server.)

## Price formula

Price = (cost x 1.10 + 0.30) / 0.971

That is the cost plus a 10% margin, plus Stripe's fixed fee, grossed up for Stripe's percentage fee.

## Risks

- If Gemini's hidden thinking costs double, Starter roughly breaks even and Standard and Pro lose money at today's prices.
- Prices that give a 30% margin instead would be about $4.27, $10.73 and $33.77.
- The storage price and thinking volume are estimates; logging real token use would replace them.
