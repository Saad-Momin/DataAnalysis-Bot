import type { Metadata } from "next";
import Link from "next/link";
import SettingsPanels from "@/components/app/SettingsPanels";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 py-8">
      <div>
        <Link href="/app" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          &larr; Back to workspace
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Settings</h1>
      </div>
      <SettingsPanels />
    </div>
  );
}
