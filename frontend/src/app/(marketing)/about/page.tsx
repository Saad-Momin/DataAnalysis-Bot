import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { CTA, PageHero, Prose, Section, FOCUS, Container } from "@/components/marketing/ui";

const description = "Why Dataloom exists and how we think about building a data tool.";
export const metadata: Metadata = {
  title: "About",
  description,
  openGraph: { title: "About | Dataloom", description, url: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="Questions about data should not need a query" />
      <Section>
        <Container className="px-0 sm:px-0 lg:px-0">
          <div className="max-w-3xl">
            <Prose>
              <p>
                Most people who work with data spend more time preparing it than learning from it. Column names are inconsistent, dates are stored as text, and the person who knows SQL is busy.
              </p>
              <p>
                {BRAND.name} is an attempt to shorten that path. You bring a file or a database table. It cleans the data with a fixed set of documented rules, then lets you ask questions in plain English and see charts when you want them.
              </p>
              <h2>How we build it</h2>
              <ul>
                <li><strong>Show the work.</strong> Every answer includes the steps that produced it, because you should be able to check a number before you use it.</li>
                <li><strong>Be plain about limits.</strong> We say what is sent to Google&apos;s Gemini API, what we do not have yet, and what is still planned.</li>
                <li><strong>Keep data private.</strong> Datasets belong to one account and can be deleted at any time.</li>
              </ul>
              <h2>Where it stands</h2>
              <p>
                {BRAND.name} is in open beta. It is free, the feature set is still growing, and your feedback shapes what comes next. Write to us on the{" "}
                <Link href="/contact" className={`rounded ${FOCUS}`}>contact page</Link> or at <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
              </p>
            </Prose>
          </div>
        </Container>
      </Section>
      <CTA />
    </>
  );
}
