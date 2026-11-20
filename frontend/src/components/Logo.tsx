import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#2563eb" />
      <rect x="7" y="17" width="4" height="8" rx="1" fill="#fff" />
      <rect x="14" y="11" width="4" height="14" rx="1" fill="#fff" />
      <rect x="21" y="6" width="4" height="19" rx="1" fill="#fff" />
    </svg>
  );
}

export default function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`} aria-label={`${BRAND.name} home`}>
      <LogoMark />
      <span className="text-lg">{BRAND.name}</span>
    </Link>
  );
}
