import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Container, PageHero, Prose, FOCUS } from "@/components/marketing/ui";

const description = "Dataloom documentation: supported files, database connections, what cleaning does, asking questions, charts, limits and troubleshooting.";
export const metadata: Metadata = {
  title: "Documentation",
  description,
  openGraph: { title: "Documentation | Dataloom", description, url: "/docs" },
};

const TOC = [
  { id: "getting-started", label: "Getting started" },
  { id: "supported-files", label: "Supported files" },
  { id: "databases", label: "Connecting a database" },
  { id: "cleaning", label: "What cleaning does" },
  { id: "questions", label: "Asking good questions" },
  { id: "charts", label: "Charts" },
  { id: "limits", label: "Limits and troubleshooting" },
];

export default function DocsPage() {
  return (
    <>
      <PageHero eyebrow="Documentation" title="Dataloom docs" lead="Everything you need to load data, ask questions and read the answers." />
      <Container className="py-12">
        <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-12">
          <nav aria-label="On this page" className="mb-10 lg:sticky lg:top-24 lg:mb-0 lg:self-start">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">On this page</p>
            <ul className="mt-3 space-y-1 border-l border-slate-200 dark:border-slate-800">
              {TOC.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className={`-ml-px block border-l border-transparent py-1 pl-4 text-sm text-slate-600 hover:border-blue-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${FOCUS}`}>
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="min-w-0 max-w-3xl">
            <Prose>
              <h2 id="getting-started">Getting started</h2>
              <ol>
                <li><Link href="/signup">Create an account</Link> and log in.</li>
                <li>In the workspace, upload a file or connect a database. New accounts can also load a sample sales dataset to try things out.</li>
                <li>Wait for the import to finish. You will see the cleaned table.</li>
                <li>Type a question in the chat. Read the answer, and open &quot;How this was computed&quot; to see the steps.</li>
              </ol>

              <h2 id="supported-files">Supported files</h2>
              <ul>
                <li><strong>CSV</strong> - comma-separated text files.</li>
                <li><strong>Excel</strong> - .xlsx only (not the older .xls). If a workbook has several sheets, choose the one to load.</li>
                <li><strong>SQL</strong> - SQL dump files. If the file creates several tables, choose the one to load.</li>
              </ul>
              <p>The maximum upload size is 100 MB.</p>

              <h2 id="databases">Connecting a database</h2>
              <p>Dataloom can import from Snowflake, PostgreSQL and MySQL. Use a read-only database user. Your credentials are used for this one import and are not stored.</p>
              <h3>PostgreSQL and MySQL</h3>
              <ul>
                <li><strong>Host</strong> - for example <code>mydb.abc123.us-east-1.rds.amazonaws.com</code> for an Amazon RDS instance.</li>
                <li><strong>Port</strong> - optional. Defaults are 5432 (PostgreSQL) and 3306 (MySQL).</li>
                <li><strong>Database</strong>, <strong>Schema</strong> (optional), <strong>Username</strong>, <strong>Password</strong>.</li>
              </ul>
              <h3>Snowflake</h3>
              <ul>
                <li><strong>Account identifier</strong> - for example <code>xy12345.us-east-1</code>.</li>
                <li><strong>Warehouse</strong>, <strong>Role</strong> (optional), <strong>Database</strong>, <strong>Schema</strong> (optional), <strong>Username</strong>, <strong>Password</strong>.</li>
              </ul>
              <h3>Table or query</h3>
              <p>Import a whole table by name, or run a query. Only a single read-only <code>SELECT</code> or <code>WITH</code> statement is accepted. Anything else is rejected. A connector import is capped at 1 million rows. Make sure your database allows connections from the internet-facing address that runs Dataloom.</p>

              <h2 id="cleaning">What cleaning does</h2>
              <p>Every import goes through the same steps:</p>
              <ol>
                <li>Normalize column names (consistent, lower-case, no stray symbols).</li>
                <li>Trim whitespace in text values.</li>
                <li>Convert null-like tokens such as &quot;N/A&quot; or &quot;null&quot; to empty values.</li>
                <li>Infer types: text that looks like numbers, booleans or dates is converted.</li>
                <li>Remove duplicate rows.</li>
                <li>Fill missing values: the median for numeric columns, &quot;Unknown&quot; for text.</li>
                <li>Drop columns that are more than 60% missing.</li>
                <li>Add date parts for date columns: year, month, quarter and weekday.</li>
                <li>Encode categorical columns so they can be grouped and compared.</li>
              </ol>
              <p>Because missing values are filled, check the cleaning summary if exact counts of blanks matter to you.</p>

              <h2 id="questions">Asking good questions</h2>
              <p>Be specific about the measure, the grouping and the time range. Examples:</p>
              <ul>
                <li>Which region has the highest revenue?</li>
                <li>What was total revenue by month in the last year?</li>
                <li>Show the top 10 products by units sold.</li>
                <li>What is the average order value for each customer segment?</li>
                <li>How many rows have a missing delivery date?</li>
              </ul>
              <p>Follow-ups work too, such as &quot;now only for the West region&quot; or &quot;and by quarter?&quot;. Use the column names you see in the table when a question could be read two ways. For anything important, open &quot;How this was computed&quot; and confirm that the steps match what you meant.</p>

              <h2 id="charts">Charts</h2>
              <p>After many answers, Dataloom asks, &quot;Would you like to see a visualization for this?&quot; Reply &quot;yes&quot; to get the best-fitting chart, or name one, for example &quot;yes as a pie chart&quot;.</p>
              <ul>
                <li><strong>Bar</strong> - compare categories.</li>
                <li><strong>Line</strong> - change over time.</li>
                <li><strong>Pie</strong> - shares of a whole, best with a few slices.</li>
                <li><strong>Area</strong> - totals over time.</li>
                <li><strong>Scatter</strong> - the relationship between two numeric columns.</li>
              </ul>

              <h2 id="limits">Limits and troubleshooting</h2>
              <ul>
                <li><strong>File size:</strong> 100 MB per upload. The plan you need depends on your largest file: up to 10 MB on Starter, 50 MB on Standard, 100 MB on Pro (see <a href="/pricing">pricing</a>).</li>
                <li><strong>Preparing a file:</strong> a 10 MB file takes a few seconds; a 100 MB file (about 1.2 million rows) can take 20 to 40 seconds. Questions take about the same time at any file size.</li>
                <li><strong>Plans:</strong> Starter $3.66, Standard $9.13 and Pro $28.62 per month include 100, 300 and 1,000 questions. Everything is free during the open beta; plan limits apply when billing starts.</li>
                <li><strong>Connector imports:</strong> 1 million rows maximum.</li>
                <li><strong>Rate limits:</strong> requests are limited per account and address to keep the service available during beta.</li>
                <li><strong>Speed:</strong> answers usually take 10 to 20 seconds. Large datasets can take longer.</li>
              </ul>
              <h3>Error messages</h3>
              <ul>
                <li><strong>429 (too many requests):</strong> you hit a rate limit. Wait a minute and try again.</li>
                <li><strong>503 (service unavailable):</strong> the AI service is busy or unreachable. Try again shortly.</li>
                <li><strong>Cannot reach the server:</strong> the backend is not running or your connection dropped.</li>
                <li><strong>Session expired:</strong> log in again.</li>
              </ul>
              <p>
                Still stuck? <Link href="/contact">Contact us</Link> or email <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. Read the <Link href="/faq">FAQ</Link> and <Link href="/security">security</Link> pages for privacy details.
              </p>
            </Prose>
          </article>
        </div>
      </Container>
    </>
  );
}
