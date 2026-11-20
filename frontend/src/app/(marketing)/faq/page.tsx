import type { Metadata } from "next";
import Link from "next/link";
import FaqList from "@/components/marketing/FaqList";
import { FAQS } from "@/components/marketing/faq-data";
import { CTA, PageHero, Section, FOCUS } from "@/components/marketing/ui";

const description = "Answers about supported files, data privacy, Gemini, accuracy, limits, pricing and self-hosting.";
export const metadata: Metadata = {
  title: "FAQ",
  description,
  openGraph: { title: "FAQ | Dataloom", description, url: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="FAQ" title="Frequently asked questions" lead="Short, direct answers. If yours is missing, ask on the contact page." />
      <Section>
        <div className="max-w-3xl">
          <FaqList items={FAQS} />
          <p className="mt-8 text-slate-700 dark:text-slate-300">
            More detail: <Link href="/docs" className={`rounded font-semibold text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>documentation</Link>,{" "}
            <Link href="/security" className={`rounded font-semibold text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>security</Link>,{" "}
            <Link href="/contact" className={`rounded font-semibold text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>contact</Link>.
          </p>
        </div>
      </Section>
      <CTA />
    </>
  );
}
