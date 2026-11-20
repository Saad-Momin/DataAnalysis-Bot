import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import ContactForm from "@/components/marketing/ContactForm";
import { PageHero, Section } from "@/components/marketing/ui";

const description = "Contact the Dataloom team: questions, bug reports, privacy requests and plan and pricing questions.";
export const metadata: Metadata = {
  title: "Contact",
  description,
  openGraph: { title: "Contact | Dataloom", description, url: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Get in touch" lead="Ask a question, report a bug, request data deletion, or ask about plans and pricing for the planned Pro and Team plans." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div className="max-w-2xl">
            <h2 className="sr-only">Contact form</h2>
            <ContactForm />
          </div>
          <aside aria-labelledby="other" className="space-y-4 text-slate-700 dark:text-slate-300">
            <h2 id="other" className="text-lg font-semibold text-slate-900 dark:text-white">Other ways to reach us</h2>
            <p>
              Email <a className="rounded font-medium text-blue-700 underline dark:text-blue-400" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
            </p>
            <p>For plan questions, mention your file size and how many questions you expect to ask each month. For privacy requests, say which account email the request is about.</p>
            <p>This is a beta, so replies may take a few days.</p>
          </aside>
        </div>
      </Section>
    </>
  );
}
