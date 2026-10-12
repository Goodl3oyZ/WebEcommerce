import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** items: [{ label, href? }] — the last item is the current page. */
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="breadcrumb" className="text-sm text-fg-subtle">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-fg hover:underline underline-offset-4">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-fg" aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
