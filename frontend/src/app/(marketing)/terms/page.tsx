import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Container, DraftBanner, PageHero, Prose } from "@/components/marketing/ui";

const description = "The terms for using Dataloom during open beta. Draft template.";
export const metadata: Metadata = {
  title: "Terms of service",
  description,
  openGraph: { title: "Terms of service | Dataloom", description, url: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of service" lead="Last updated: draft, not yet in force." />
      <Container className="py-12">
        <div className="max-w-3xl">
          <DraftBanner />
          <Prose>
            <h2>1. Agreement</h2>
            <p>By creating an account or using {BRAND.name}, you agree to these terms and to the <Link href="/privacy">privacy policy</Link>. If you do not agree, do not use the service.</p>

            <h2>2. Beta service</h2>
            <p>{BRAND.name} is an open beta. It is provided as is, features may change or be removed, and the service may be unavailable or contain errors. Keep your own copies of important data.</p>

            <h2>3. Your account</h2>
            <p>You are responsible for your account and password and for activity under it. Provide accurate information and tell us if you suspect unauthorised access.</p>

            <h2>4. Your data</h2>
            <p>You keep ownership of the data you upload or import. You give us permission to store and process it to provide the service, including sending limited information (schema, column names, sample values and aggregated results) to Google&apos;s Gemini API as described in the privacy policy. You confirm that you have the right to upload the data and that doing so does not break the law or anyone&apos;s rights, including data protection obligations that apply to you.</p>

            <h2>5. Acceptable use</h2>
            <ul>
              <li>Do not attempt to break, probe or overload the service or bypass rate limits.</li>
              <li>Do not try to access other users&apos; data.</li>
              <li>Do not use the service for unlawful activity or to store content you have no right to hold.</li>
              <li>Connect only to databases you are authorised to access.</li>
            </ul>

            <h2>6. Answers may be wrong</h2>
            <p>Answers and charts are generated automatically. They can be incorrect or misleading. Review the &quot;How this was computed&quot; steps and verify results before you rely on them for decisions.</p>

            <h2>7. Fees</h2>
            <p>The beta is free. If paid plans are introduced, we will announce pricing before any charge applies.</p>

            <h2>8. Termination</h2>
            <p>You can delete your account at any time from settings. We may suspend or end accounts that break these terms or put the service at risk.</p>

            <h2>9. Disclaimers and liability</h2>
            <p>To the extent the law allows, the service is provided without warranties, and we are not liable for indirect or consequential losses. Counsel should set the final wording and any liability cap for your jurisdiction.</p>

            <h2>10. Changes</h2>
            <p>We may update these terms. Continued use after a change means you accept the new terms.</p>

            <h2>11. Contact</h2>
            <p>Use the <Link href="/contact">contact page</Link> or email <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.</p>
          </Prose>
        </div>
      </Container>
    </>
  );
}
