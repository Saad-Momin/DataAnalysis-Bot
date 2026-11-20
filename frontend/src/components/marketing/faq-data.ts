import { BRAND } from "@/lib/brand";

export interface QA {
  q: string;
  a: string;
}

export const FAQS: QA[] = [
  {
    q: "What kinds of data can I use?",
    a: "CSV, Excel (.xlsx), and SQL dump files that you upload, up to 100 MB. You can also connect Snowflake, PostgreSQL or MySQL and import a table or the result of a read-only query.",
  },
  {
    q: "Is my data used to train AI models?",
    a: "Dataloom does not train its own models on your data. To write and explain answers, we send limited information to Google's Gemini API: your dataset's schema, column names, a few sample values and the aggregated results of queries. We do not send full raw tables. Google handles that data under its API terms, so read those if your data is sensitive.",
  },
  {
    q: "Can other users see my datasets?",
    a: "No. Every dataset belongs to one account, and requests for another account's dataset are answered as if it does not exist.",
  },
  {
    q: "Can I delete my data?",
    a: "Yes. Deleting a dataset removes its stored files and rows. Deleting your account from Settings removes the account and all of its datasets. For anything else, use the contact page.",
  },
  {
    q: "How accurate are the answers?",
    a: "Answers come from code that runs on your actual data, so numbers are computed rather than guessed. The question can still be misunderstood, though, so check anything important. Each answer has a \"How this was computed\" section that shows the steps. Read it before you rely on a number.",
  },
  {
    q: "How does Dataloom clean my data?",
    a: "On import it normalizes column names, trims whitespace, converts null-like text to empty values, infers numbers, booleans and dates, removes duplicate rows, fills missing values, and drops columns that are more than 60% empty. The docs list each step.",
  },
  {
    q: "Which databases are supported?",
    a: "Snowflake, PostgreSQL and MySQL. Use a read-only database user. Credentials are used for one import and are not stored, and only a single SELECT or WITH statement is accepted. A connector import is capped at 1 million rows.",
  },
  {
    q: "What does it cost?",
    a: "Dataloom is free during the open beta. When billing starts, plans are priced by the size of your largest file: Starter $3.66 per month (100 questions, files up to 10 MB), Standard $9.13 (300 questions, up to 50 MB) and Pro $28.62 (1,000 questions, up to 100 MB). A question costs the same at any file size. We will announce the start date before anyone is charged. See the pricing page for details.",
  },
  {
    q: "Can I self-host Dataloom?",
    a: "The project is a Next.js frontend and a FastAPI backend, so it can run on your own infrastructure. If you do, run the backend in a container with CPU and memory limits, because the code that answers questions runs in a subprocess on that machine. There is no packaged installer or support plan for self-hosting yet.",
  },
  {
    q: "What are the limits?",
    a: "Uploads are limited to 100 MB, connector imports to 1 million rows, and requests are rate limited. When billing starts, each plan also sets a largest file size, a monthly question allowance and a number of stored datasets (see the pricing page). Answers usually take 10 to 20 seconds, and preparing a large file can take 20 to 40 seconds. The docs explain the 429 and 503 messages.",
  },
  {
    q: "Which charts can it draw?",
    a: "Bar, line, pie, area and scatter charts. After an answer, Dataloom offers a chart. Reply \"yes\", or ask for a specific type such as \"yes as a pie chart\".",
  },
  {
    q: "Does Dataloom have SOC 2, SSO or other certifications?",
    a: "No. There is no SOC 2 or ISO certification, and no single sign-on yet. The security page lists what is in place today.",
  },
  {
    q: "How do I get help or report a problem?",
    a: `Use the contact page or email ${BRAND.supportEmail}. This is a beta, so bug reports are welcome.`,
  },
];
