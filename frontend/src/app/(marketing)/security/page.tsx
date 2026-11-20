import type { Metadata } from "next";
import Link from "next/link";
import { CTA, Check, FeatureCard, Icon, PageHero, Section, SectionHeading, FOCUS } from "@/components/marketing/ui";

const description = "What Dataloom does to protect your data, what it sends to Google's Gemini API, and what it does not have yet.";
export const metadata: Metadata = {
  title: "Security",
  description,
  openGraph: { title: "Security | Dataloom", description, url: "/security" },
};

export default function SecurityPage() {
  return (
    <>
      <PageHero eyebrow="Security" title="What we do, and what we don't" lead="Dataloom is a beta product. This page lists only what is true today, including the limits." />

      <Section labelledBy="gemini">
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 sm:p-8 dark:border-amber-600 dark:bg-amber-950/60">
          <h2 id="gemini" className="text-2xl font-bold text-slate-900 dark:text-white">What is sent to Google&apos;s Gemini API</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-800 dark:text-slate-200">
            Dataloom uses Google&apos;s Gemini API to write analysis code and to explain results. For that, we send:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-800 dark:text-slate-200">
            <li>your dataset&apos;s schema and column names</li>
            <li>a few sample values from the data</li>
            <li>the aggregated results of the queries that run</li>
          </ul>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-800 dark:text-slate-200">
            Full raw tables are not sent. Google processes this data under its own API terms. If your data cannot leave your control in even this limited form, do not upload it. See the{" "}
            <Link href="/privacy" className={`rounded font-semibold underline ${FOCUS}`}>privacy policy</Link> for more.
          </p>
        </div>
      </Section>

      <Section tone="subtle" labelledBy="controls">
        <SectionHeading id="controls" title="Controls in place today" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <FeatureCard icon={<Icon name="code" />} title="Validated, isolated code">
            AI-written Pandas code is checked against an AST allow-list before it runs. It runs in an isolated subprocess with a 30-second timeout, restricted built-ins and secrets removed from its environment.
          </FeatureCard>
          <FeatureCard icon={<Icon name="db" />} title="Database credentials">
            Credentials you enter are used for a single import and are never stored. Remote imports accept only read-only single SELECT or WITH statements. We still recommend a read-only database user.
          </FeatureCard>
          <FeatureCard icon={<Icon name="lock" />} title="Account isolation">
            Each account sees only its own datasets and conversations. Asking for another account&apos;s dataset returns &quot;not found&quot;.
          </FeatureCard>
          <FeatureCard icon={<Icon name="shield" />} title="Accounts and sessions">
            Passwords are hashed. Sessions use httpOnly cookies. Login, signup and password-reset requests are rate limited.
          </FeatureCard>
          <FeatureCard icon={<Icon name="table" />} title="Deletion">
            Deleting a dataset removes its stored files and rows. Deleting your account removes all of your datasets too.
          </FeatureCard>
        </div>
      </Section>

      <Section labelledBy="limits">
        <SectionHeading id="limits" title="What we do not have yet" />
        <ul className="mt-8 max-w-3xl space-y-3 text-slate-700 dark:text-slate-300">
          <Check>No SOC 2, ISO 27001 or similar certification.</Check>
          <Check>No single sign-on (SSO) or team roles.</Check>
          <Check>No on-premises edition. If you self-host the open code, run the backend in containers with CPU and memory limits, because analysis code executes on that machine.</Check>
          <Check>Beta software. Expect bugs, and keep your own copies of important data.</Check>
        </ul>
        <p className="mt-8 max-w-3xl text-slate-700 dark:text-slate-300">
          Found a vulnerability? Please tell us through the <Link href="/contact" className={`rounded font-semibold text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>contact page</Link> before disclosing it publicly.
        </p>
      </Section>

      <CTA />
    </>
  );
}
