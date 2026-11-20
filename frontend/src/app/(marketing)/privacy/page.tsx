import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Container, DraftBanner, PageHero, Prose } from "@/components/marketing/ui";

const description = "How Dataloom collects, uses, shares, retains and deletes your information. Draft template.";
export const metadata: Metadata = {
  title: "Privacy policy",
  description,
  openGraph: { title: "Privacy policy | Dataloom", description, url: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy policy" lead="Last updated: draft, not yet in force." />
      <Container className="py-12">
        <div className="max-w-3xl">
          <DraftBanner />
          <Prose>
            <p>This policy explains what {BRAND.name} collects and how it is used during the open beta.</p>

            <h2>Information we collect</h2>
            <ul>
              <li><strong>Account information:</strong> your name, email address and a hashed password.</li>
              <li><strong>Datasets you provide:</strong> files you upload and data you import from a database, plus the cleaned version we store.</li>
              <li><strong>Conversations:</strong> the questions you ask and the answers and charts produced.</li>
              <li><strong>Usage and technical logs:</strong> request logs, IP addresses (used for rate limiting) and error information.</li>
              <li><strong>Messages you send us</strong> through the contact form.</li>
            </ul>
            <p>Database credentials you enter are used for a single import and are not stored.</p>

            <h2>How we use it</h2>
            <p>To run the service: authenticate you, import and clean your data, answer your questions, prevent abuse, fix bugs and reply to messages. We do not sell your information, and we do not train our own models on your data.</p>

            <h2>Service providers</h2>
            <p>
              To write and explain answers, {BRAND.name} sends your dataset&apos;s schema, column names, a few sample values and aggregated query results to <strong>Google&apos;s Gemini API</strong>. Full raw tables are not sent. Google processes this data under its own API terms and privacy policy. Hosting and infrastructure providers may also process data on our behalf. Add the names of your final hosting providers here before launch.
            </p>

            <h2>Retention</h2>
            <p>Datasets, conversations and account information are kept until you delete them or your account. Deleting a dataset removes its stored files and rows. Deleting your account removes the account and all of its datasets. Server logs and backups may persist for a limited period. State the exact period before launch.</p>

            <h2>Your choices and rights</h2>
            <p>You can edit your name and delete datasets or your account in the app settings. To request a copy of your information, a correction or deletion that you cannot do yourself, use the <Link href="/contact">contact page</Link>. Depending on where you live, you may have additional legal rights; counsel should confirm which apply.</p>

            <h2>Security</h2>
            <p>See the <Link href="/security">security page</Link> for the measures in place and for their limits. No system is perfectly secure.</p>

            <h2>Cookies</h2>
            <p>We use a session cookie to keep you logged in. It is httpOnly and expires after 7 days. We do not use advertising cookies.</p>

            <h2>Children</h2>
            <p>{BRAND.name} is not intended for children under 16.</p>

            <h2>Changes</h2>
            <p>We will update this page when the policy changes and will note significant changes in the app or by email.</p>

            <h2>Contact</h2>
            <p>Use the <Link href="/contact">contact page</Link> or email <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.</p>
          </Prose>
        </div>
      </Container>
    </>
  );
}
