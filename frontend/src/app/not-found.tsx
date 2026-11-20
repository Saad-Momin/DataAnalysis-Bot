import Link from "next/link";
import Logo from "@/components/Logo";

export default function NotFound() {
  const link =
    "rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Error 404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-slate-600 dark:text-slate-300">The page you are looking for does not exist or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={`${link} bg-blue-600 text-white hover:bg-blue-700`}>Go to home</Link>
        <Link href="/docs" className={`${link} border border-slate-300 text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800`}>Read the docs</Link>
        <Link href="/contact" className={`${link} border border-slate-300 text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800`}>Contact us</Link>
      </div>
    </main>
  );
}
