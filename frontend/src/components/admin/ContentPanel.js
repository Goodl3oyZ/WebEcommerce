"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ArrowLeft, ExternalLink, FileText, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { contentAPI } from "@/lib/api/content";
import { uploadAPI } from "@/lib/api/upload";
import { Spinner } from "@/components/ui/PageLoader";

const card = "rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6";
const input =
  "mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus:border-fg focus:outline-none focus:ring-2 focus:ring-fg/10";
const KINDS = [
  { id: "article", label: "บทความ", path: (slug) => `/blog/${slug}` },
  { id: "page", label: "หน้าเว็บ", path: (slug) => (slug === "about" ? "/about" : null) },
];
const kindOf = (id) => KINDS.find((k) => k.id === id) ?? KINDS[0];
const errorText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const dateText = (v) => (v ? new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "–");

const emptyPost = (kind) => ({ kind, title: "", slug: "", excerpt: "", content: "", coverImage: null, coverImageUrl: null, status: "draft" });

function StatusBadge({ status }) {
  return status === "published" ? (
    <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">เผยแพร่แล้ว</span>
  ) : (
    <span className="rounded-full bg-fg/10 px-2.5 py-0.5 text-xs font-semibold text-fg-muted">ฉบับร่าง</span>
  );
}

/** Create or edit one post. */
function PostEditor({ initial, onDone }) {
  const [post, setPost] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const isNew = !initial.id;
  const set = (patch) => setPost((p) => ({ ...p, ...patch }));

  const uploadCover = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { fileName, url } = await uploadAPI.uploadSiteLogo(file);
      set({ coverImage: fileName, coverImageUrl: url });
    } catch (e) {
      toast.error(errorText(e, "อัปโหลดรูปไม่สำเร็จ"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (status) => {
    if (!post.title.trim()) return toast.error("กรุณาใส่ชื่อเรื่อง");
    setSaving(true);
    const body = {
      title: post.title.trim(),
      excerpt: post.excerpt?.trim() || null,
      content: post.content || "",
      coverImage: post.coverImage || null,
      status,
      ...(post.slug?.trim() ? { slug: post.slug.trim().toLowerCase() } : {}),
    };
    try {
      const saved = isNew ? await contentAPI.create({ ...body, kind: post.kind }) : await contentAPI.update(post.id, body);
      toast.success(status === "published" ? "เผยแพร่แล้ว" : "บันทึกฉบับร่างแล้ว");
      onDone(saved);
    } catch (e) {
      toast.error(errorText(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  const publicPath = post.slug && post.status === "published" ? kindOf(post.kind).path(post.slug) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => onDone(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden /> กลับไปรายการ
        </button>
        <div className="flex items-center gap-2">
          {!isNew && <StatusBadge status={initial.status} />}
          {publicPath && (
            <a href={publicPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg">
              ดูหน้าเว็บ <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>

      <section className={`${card} space-y-5`}>
        <div>
          <label htmlFor="post-title" className="block text-sm font-medium text-fg">ชื่อเรื่อง</label>
          <input id="post-title" className={input} value={post.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="post-slug" className="block text-sm font-medium text-fg">ที่อยู่หน้า (slug)</label>
            <input
              id="post-slug"
              className={input}
              value={post.slug}
              onChange={(e) => set({ slug: e.target.value })}
              placeholder={isNew ? "สร้างจากชื่อเรื่องให้อัตโนมัติ" : ""}
              maxLength={160}
              disabled={post.kind === "page" && initial.slug === "about"}
            />
            <p className="mt-1 text-xs text-fg-subtle">
              ภาษาอังกฤษตัวเล็ก ตัวเลข และขีด (-) เช่น how-to-choose-a-watch
              {post.kind === "page" && initial.slug === "about" && " · หน้านี้คือ /about เปลี่ยนไม่ได้"}
            </p>
          </div>
          <div>
            <label htmlFor="post-excerpt" className="block text-sm font-medium text-fg">คำโปรย</label>
            <input id="post-excerpt" className={input} value={post.excerpt ?? ""} onChange={(e) => set({ excerpt: e.target.value })} maxLength={500} />
            <p className="mt-1 text-xs text-fg-subtle">แสดงในรายการบทความและตอนแชร์ลิงก์</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-fg">รูปปก</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-4">
            <div className="flex aspect-[16/10] w-48 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
              {post.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview of any configured host
                <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <FileText className="h-6 w-6 text-fg-subtle" aria-hidden />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" id="post-cover" onChange={(e) => uploadCover(e.target.files?.[0])} />
              <label htmlFor="post-cover" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-fg/5">
                {uploading ? <Spinner className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" aria-hidden />} เลือกรูป
              </label>
              {post.coverImageUrl && (
                <button type="button" onClick={() => set({ coverImage: null, coverImageUrl: null })} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-danger hover:bg-danger/10">
                  <X className="h-4 w-4" aria-hidden /> เอารูปออก
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">เนื้อหา</p>
          {/* Keyed by post so the editor loads each post's content. */}
          <RichTextEditor key={post.id || "new"} value={post.content} onChange={(html) => set({ content: html })} placeholder="เขียนเนื้อหา..." />
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={saving} onClick={() => save("draft")} className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-fg/5 disabled:opacity-50">
          {initial.status === "published" ? "ย้ายเป็นฉบับร่าง" : "บันทึกฉบับร่าง"}
        </button>
        <button type="button" disabled={saving} onClick={() => save("published")} className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-6 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50">
          {saving && <Spinner className="h-4 w-4 border-canvas/30 border-t-canvas" />}
          {initial.status === "published" ? "บันทึกและเผยแพร่" : "เผยแพร่"}
        </button>
      </div>
    </div>
  );
}

/** Admin: blog articles and site pages (About). */
export function ContentPanel() {
  const [kind, setKind] = useState("article");
  const [posts, setPosts] = useState(null);
  const [editing, setEditing] = useState(null); // post being edited, or emptyPost()

  const load = useCallback(async () => {
    setPosts(null);
    try {
      const res = await contentAPI.list({ kind, limit: 50 });
      setPosts(res.posts ?? []);
    } catch (e) {
      toast.error(errorText(e, "โหลดรายการไม่สำเร็จ"));
      setPosts([]);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (post) => {
    try {
      setEditing(await contentAPI.get(post.id)); // list rows have no body
    } catch (e) {
      toast.error(errorText(e, "เปิดไม่สำเร็จ"));
    }
  };

  const remove = async (post) => {
    if (!window.confirm(`ลบ "${post.title}"? กู้คืนไม่ได้`)) return;
    try {
      await contentAPI.remove(post.id);
      toast.success("ลบแล้ว");
      load();
    } catch (e) {
      toast.error(errorText(e, "ลบไม่สำเร็จ"));
    }
  };

  if (editing) {
    return (
      <PostEditor
        key={editing.id || "new"}
        initial={editing}
        onDone={(saved) => {
          setEditing(null);
          if (saved) load();
        }}
      />
    );
  }

  const hasAbout = posts?.some((p) => p.slug === "about");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-fg">บทความและหน้าเว็บ</h2>
          <p className="mt-1 text-sm text-fg-muted">บทความแสดงที่ /blog · หน้า &quot;เรื่องราวของเรา&quot; คือหน้าเว็บ slug about</p>
        </div>
        {kind === "article" ? (
          <button type="button" onClick={() => setEditing(emptyPost("article"))} className="inline-flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-sm font-semibold text-canvas hover:bg-fg/85">
            <Plus className="h-4 w-4" aria-hidden /> เขียนบทความ
          </button>
        ) : (
          posts &&
          !hasAbout && (
            <button
              type="button"
              onClick={() => setEditing({ ...emptyPost("page"), slug: "about", title: "เรื่องราวของเรา" })}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-sm font-semibold text-canvas hover:bg-fg/85"
            >
              <Plus className="h-4 w-4" aria-hidden /> สร้างหน้าเรื่องราวของเรา
            </button>
          )
        )}
      </div>

      <div role="tablist" aria-label="ประเภท" className="inline-flex rounded-full bg-surface-muted p-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${kind === k.id ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <section className={card}>
        {posts === null ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : posts.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">{kind === "article" ? "ยังไม่มีบทความ" : "ยังไม่มีหน้าเว็บ"}</p>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((p) => {
              const path = p.status === "published" ? kindOf(p.kind).path(p.slug) : null;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{p.title}</p>
                    <p className="mt-0.5 truncate text-xs text-fg-subtle">
                      /{p.slug} · แก้ไขล่าสุด {dateText(p.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  <div className="flex items-center gap-1">
                    {path && (
                      <a href={path} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted hover:bg-fg/5 hover:text-fg" aria-label={`ดู ${p.title}`}>
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    )}
                    <button type="button" onClick={() => open(p)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted hover:bg-fg/5 hover:text-fg" aria-label={`แก้ไข ${p.title}`}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => remove(p)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted hover:bg-danger/10 hover:text-danger" aria-label={`ลบ ${p.title}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
