import { SERIES_DARK, SERIES_LIGHT } from "@/lib/palette";

/**
 * Static HTML/SVG illustration of the workspace: a chat exchange followed by a chart.
 * Colours come from the validated palette in src/lib/viz.ts. The data is invented.
 */

const REGIONS = [
  { name: "West", value: 412 },
  { name: "East", value: 358 },
  { name: "South", value: 271 },
  { name: "North", value: 196 },
];

function BarChart() {
  const max = 450;
  const h = 120;
  return (
    <svg viewBox="0 0 280 160" role="img" aria-label="Bar chart of revenue by region: West 412 thousand, East 358, South 271, North 196 (illustrative values)" className="h-auto w-full">
      {[0, 150, 300, 450].map((t) => {
        const y = 10 + h - (t / max) * h;
        return (
          <g key={t}>
            <line x1="34" x2="274" y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
            <text x="28" y={y + 3} textAnchor="end" fontSize="9" className="fill-slate-600 dark:fill-slate-400">
              {t}k
            </text>
          </g>
        );
      })}
      {REGIONS.map((r, i) => {
        const bh = (r.value / max) * h;
        const x = 46 + i * 58;
        return (
          <g key={r.name}>
            <rect x={x} y={10 + h - bh} width="40" height={bh} rx="3" fill={SERIES_LIGHT[0]} className="dark:hidden" />
            <rect x={x} y={10 + h - bh} width="40" height={bh} rx="3" fill={SERIES_DARK[0]} className="hidden dark:block" />
            <text x={x + 20} y={10 + h - bh - 4} textAnchor="middle" fontSize="9" fontWeight="600" className="fill-slate-800 dark:fill-slate-200">
              {r.value}k
            </text>
            <text x={x + 20} y={10 + h + 14} textAnchor="middle" fontSize="10" className="fill-slate-600 dark:fill-slate-400">
              {r.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Small donut used on the features page. */
export function DonutMock() {
  const data = [
    { name: "Hardware", v: 46 },
    { name: "Software", v: 28 },
    { name: "Services", v: 17 },
    { name: "Other", v: 9 },
  ];
  const r = 40;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <figure className="m-0">
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 120 120" role="img" aria-label="Donut chart of revenue share by product line: Hardware 46%, Software 28%, Services 17%, Other 9% (illustrative values)" className="h-28 w-28 flex-none -rotate-90">
          {data.map((d, i) => {
            const len = (d.v / 100) * c;
            const el = (
              <g key={d.name}>
                <circle cx="60" cy="60" r={r} fill="none" stroke={SERIES_LIGHT[i]} strokeWidth="18" strokeDasharray={`${len - 1.5} ${c - len + 1.5}`} strokeDashoffset={-acc} className="dark:hidden" />
                <circle cx="60" cy="60" r={r} fill="none" stroke={SERIES_DARK[i]} strokeWidth="18" strokeDasharray={`${len - 1.5} ${c - len + 1.5}`} strokeDashoffset={-acc} className="hidden dark:block" />
              </g>
            );
            acc += len;
            return el;
          })}
        </svg>
        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: SERIES_LIGHT[i] }} aria-hidden="true" />
              {d.name} <span className="text-slate-600 dark:text-slate-400">{d.v}%</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export default function ProductMock({ className = "" }: { className?: string }) {
  return (
    <figure className={`m-0 ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="ml-3 truncate text-xs text-slate-600 dark:text-slate-400">sample-sales.csv &middot; 200 rows</span>
        </div>
        <div className="space-y-3 p-4 text-sm sm:p-5">
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2 text-white">Which region has the highest revenue?</p>
          </div>
          <div className="flex">
            <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              West has the highest revenue at 412k, ahead of East at 358k. North is lowest at 196k.
              <span className="mt-2 block font-medium">Would you like to see a visualization for this?</span>
            </p>
          </div>
          <div className="flex justify-end">
            <p className="rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2 text-white">Yes</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-1 text-xs font-semibold text-slate-800 dark:text-slate-200">Revenue by region</p>
            <BarChart />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-slate-600 dark:text-slate-400">Illustrative example. The numbers are invented.</figcaption>
    </figure>
  );
}
