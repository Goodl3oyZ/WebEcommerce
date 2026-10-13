import Link from "next/link";
import Container from "@/components/shop/Container";
import { formatThaiDate } from "@/components/content/ContentBody";
import { serverGet } from "@/lib/serverApi";

export const metadata = {
  title: "บทความ",
  description: "วิธีเลือกอุปกรณ์ ใช้ข้อมูลจากอุปกรณ์สวมใส่ และฟื้นตัวหลังซ้อม",
};

const PER_PAGE = 12;

export default async function BlogPage({ searchParams }) {
  const page = Math.max(1, Number.parseInt((await searchParams)?.page, 10) || 1);
  const res = await serverGet(`/content/articles?page=${page}&limit=${PER_PAGE}`);
  const articles = res?.articles ?? [];
  const pages = res?.pagination?.pages ?? 1;

  return (
    <Container className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-fg-subtle">Journal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">บทความ</h1>
        <p className="mt-3 text-fg-muted">วิธีเลือกอุปกรณ์ อ่านข้อมูลจากอุปกรณ์สวมใส่ และฟื้นตัวหลังซ้อมให้ดีขึ้น</p>
      </header>

      {res === null ? (
        <p className="mt-12 rounded-2xl border border-border p-8 text-center text-fg-muted">โหลดบทความไม่สำเร็จ ลองใหม่อีกครั้ง</p>
      ) : articles.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center text-fg-muted">ยังไม่มีบทความ เร็ว ๆ นี้</p>
      ) : (
        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/blog/${a.slug}`} className="group block">
                <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-surface-muted">
                  {a.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- covers come from any configured host
                    <img
                      src={a.coverImageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <time dateTime={a.publishedAt} className="mt-4 block text-xs text-fg-subtle">
                  {formatThaiDate(a.publishedAt)}
                </time>
                <h2 className="mt-1 text-lg font-semibold leading-snug text-fg group-hover:underline group-hover:underline-offset-4">
                  {a.title}
                </h2>
                {a.excerpt && <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{a.excerpt}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="หน้าบทความ" className="mt-12 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={n === 1 ? "/blog" : `/blog?page=${n}`}
              aria-current={n === page ? "page" : undefined}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium ${
                n === page ? "bg-fg text-canvas" : "border border-border hover:bg-fg/5"
              }`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </Container>
  );
}
