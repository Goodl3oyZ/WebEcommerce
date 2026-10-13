import Container from "@/components/shop/Container";
import ContentBody from "@/components/content/ContentBody";
import { serverGet } from "@/lib/serverApi";

/** Edited in the admin panel (Content > page "about"). */
export async function generateMetadata() {
  const page = await serverGet("/content/pages/about");
  return { title: page?.title || "เรื่องราวของเรา", description: page?.excerpt || undefined };
}

export default async function AboutPage() {
  const page = await serverGet("/content/pages/about");

  return (
    <Container className="py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page?.title || "เรื่องราวของเรา"}</h1>
        {page?.excerpt && <p className="mt-3 text-lg text-fg-muted">{page.excerpt}</p>}
        {page?.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- covers come from any configured host
          <img src={page.coverImageUrl} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
        )}
        <div className="mt-10">
          {page ? (
            <ContentBody html={page.content} />
          ) : (
            <p className="text-fg-muted">กำลังเตรียมเนื้อหาหน้านี้ เร็ว ๆ นี้</p>
          )}
        </div>
      </article>
    </Container>
  );
}
