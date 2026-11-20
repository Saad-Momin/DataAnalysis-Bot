import { FOCUS } from "./ui";
import type { QA } from "./faq-data";

export default function FaqList({ items }: { items: QA[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4">
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden ${FOCUS}`}>
            {f.q}
            <svg className="h-5 w-5 flex-none text-slate-600 transition-transform group-open:rotate-180 dark:text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </summary>
          <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
