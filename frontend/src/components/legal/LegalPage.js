import Link from "next/link";
import Container from "@/components/shop/Container";

/** Optional public contact address, set at build time. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

/** Reading layout for policy pages: title, last-updated date, sections. */
export default function LegalPage({ title, updated, intro, children }) {
  return (
    <Container className="py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-fg-subtle">ปรับปรุงล่าสุด {updated}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{title}</h1>
        {intro && <p className="mt-5 text-base leading-relaxed text-fg-muted">{intro}</p>}
        <div className="mt-10 space-y-10">{children}</div>
      </article>
    </Container>
  );
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-fg">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-fg-muted [&_li]:pl-1 [&_strong]:text-fg [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/** How to reach the shop: the support chat, plus email when configured. */
export function ContactLine() {
  return (
    <>
      กดปุ่ม <strong>ติดต่อทีมงาน</strong> ที่มุมขวาล่างของทุกหน้าเพื่อแชทกับเรา
      {CONTACT_EMAIL && (
        <>
          {" "}
          หรืออีเมลมาที่{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-fg underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
        </>
      )}
      {" "}(ดูข้อมูลเพิ่มเติมที่หน้า{" "}
      <Link href="/contact" className="font-medium text-fg underline underline-offset-4">
        ติดต่อเรา
      </Link>
      )
    </>
  );
}
