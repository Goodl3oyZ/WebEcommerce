import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/shop/Container";
import ContentBody, { formatThaiDate } from "@/components/content/ContentBody";
import { serverGet } from "@/lib/serverApi";

const getArticle = (slug) => serverGet(`/content/articles/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }) {
  const article = await getArticle((await params).slug);
  if (!article) return { title: "ไม่พบบทความ" };
  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: { title: article.title, description: article.excerpt || undefined, type: "article" },
  };
}

export default async function ArticlePage({ params }) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();

  return (
    <Container className="py-10 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden /> บทความทั้งหมด
        </Link>
        <header className="mt-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
          {article.excerpt && <p className="mt-3 text-lg text-fg-muted">{article.excerpt}</p>}
          <p className="mt-4 text-sm text-fg-subtle">
            <time dateTime={article.publishedAt}>{formatThaiDate(article.publishedAt)}</time>
            {article.author?.name && <> · {article.author.name}</>}
          </p>
        </header>
        {article.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- covers come from any configured host
          <img src={article.coverImageUrl} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
        )}
        <div className="mt-10">
          <ContentBody html={article.content} />
        </div>
      </article>
    </Container>
  );
}
