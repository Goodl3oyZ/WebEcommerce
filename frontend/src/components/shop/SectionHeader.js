import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SectionHeader({ eyebrow, title, description, href, linkLabel = "ดูทั้งหมด", id }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-fg-subtle">{eyebrow}</p>
        )}
        <h2 id={id} className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-fg-muted sm:text-base">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-fg underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
