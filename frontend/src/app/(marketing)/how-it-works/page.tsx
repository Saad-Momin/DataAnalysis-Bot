import type { Metadata } from "next";
import ProductMock from "@/components/marketing/ProductMock";
import { ButtonLink, Check, CTA, PageHero, Section, SectionHeading } from "@/components/marketing/ui";

const description = "How Dataloom takes a file or database table, cleans it, and answers your questions with charts on request.";
export const metadata: Metadata = {
  title: "How it works",
  description,
  openGraph: { title: "How it works | Dataloom", description, url: "/how-it-works" },
};

const STEPS = [
  {
    title: "Add your data",
    body: "Upload a CSV, Excel or SQL file (up to 100 MB), or connect Snowflake, PostgreSQL or MySQL and import a table or a read-only query.",
    points: ["Pick a sheet or table when a file has several", "Use a read-only database user", "Credentials are used for one import and are not stored"],
  },
  {
    title: "Dataloom cleans it",
    body: "The same documented steps run on every import, and you can see the cleaned table before you ask anything.",
    points: ["Names normalized, whitespace trimmed, duplicates removed", "Numbers, booleans and dates inferred", "Missing values filled; columns over 60% empty dropped"],
  },
  {
    title: "Ask in plain English",
    body: "Dataloom writes analysis code for your question, checks it, runs it in an isolated process and explains the result.",
    points: ["Follow-up questions keep context", "\"How this was computed\" shows the steps", "Answers usually take 10 to 20 seconds"],
  },
  {
    title: "Get a chart if you want one",
    body: "After an answer, Dataloom asks whether you would like a visualization. Say yes, or name a type.",
    points: ["Bar, line, pie, area and scatter", "Reply \"yes as a pie chart\" to choose", "Charts follow your light or dark theme"],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="How it works" title="From a messy file to a clear answer" lead="Four steps. The first two take a minute; the rest is a conversation." />

      <Section labelledBy="steps">
        <h2 id="steps" className="sr-only">Steps</h2>
        <ol className="space-y-12">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-4 md:grid-cols-[auto_1fr] md:gap-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white"><span className="sr-only">Step {i + 1}: </span>{s.title}</h3>
                <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>
                <ul className="mt-4 space-y-2 text-slate-700 dark:text-slate-300">
                  {s.points.map((p) => (
                    <Check key={p}>{p}</Check>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="subtle" labelledBy="example">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading id="example" title="An example conversation" lead="Ask a question, read the answer, and say yes to see it as a chart." />
            <p className="mt-6"><ButtonLink href="/docs">Read the docs</ButtonLink></p>
          </div>
          <ProductMock />
        </div>
      </Section>

      <CTA />
    </>
  );
}
