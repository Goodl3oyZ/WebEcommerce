import DOMPurify from "isomorphic-dompurify";

/** Editor HTML, sanitized, in the shop's reading style. */
export default function ContentBody({ html }) {
  return (
    <div
      className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:underline-offset-4 prose-img:rounded-2xl"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || "") }}
    />
  );
}

export const formatThaiDate = (value) =>
  value ? new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "";
