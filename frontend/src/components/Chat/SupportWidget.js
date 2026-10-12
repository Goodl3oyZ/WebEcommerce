"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Headset, Loader2, MessageCircle, Package, Send, Truck, CircleHelp, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, useSocketEvent } from "@/contexts/ChatContext";
import { supportAPI, supportError } from "@/lib/api/support";

const time = (d) => new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
const POLL_MS = 15000;

function StatusLine({ conv }) {
  if (!conv) return <span>เราพร้อมช่วยเหลือคุณ</span>;
  if (conv.status === "closed") return <span>การสนทนาจบแล้ว</span>;
  if (conv.status === "active" && conv.agent) return <span>{conv.agent.name} กำลังดูแลคุณ</span>;
  return <span>รอทีมงาน{conv.queuePosition ? ` · คิวที่ ${conv.queuePosition}` : ""}</span>;
}

function Bubble({ m }) {
  if (m.senderRole === "system") {
    return (
      <li className="mx-auto max-w-[85%] text-center text-[11px] leading-relaxed text-fg-subtle">{m.body}</li>
    );
  }
  const mine = m.senderRole === "customer";
  return (
    <li className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      {!mine && <span className="mb-1 text-[11px] font-medium text-fg-muted">{m.senderName || "ทีมงาน"}</span>}
      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          mine ? "rounded-br-md bg-fg text-canvas" : "rounded-bl-md bg-surface-muted text-fg"
        }`}
      >
        {m.body}
      </p>
      <time className="mt-1 text-[10px] text-fg-subtle" dateTime={m.createdAt}>
        {time(m.createdAt)}
      </time>
    </li>
  );
}

function StartForm({ config, onStarted }) {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const max = config?.maxMessageLength ?? 1000;

  const submit = async (e) => {
    e.preventDefault();
    if (!topic) return setError("กรุณาเลือกหัวข้อที่ต้องการติดต่อ");
    if (!message.trim()) return setError("กรุณาพิมพ์รายละเอียด");
    setSending(true);
    setError(null);
    try {
      onStarted(await supportAPI.start(topic, message.trim()));
    } catch (err) {
      setError(supportError(err, "ส่งไม่สำเร็จ"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <p className="text-sm text-fg-muted">ลองดูคำตอบด่วนก่อนได้ หรือส่งข้อความถึงทีมงานด้านล่าง</p>
      <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        {[
          { href: "/orders", label: "ติดตามคำสั่งซื้อ", Icon: Package },
          { href: "/shipping", label: "การจัดส่ง", Icon: Truck },
          { href: "/faq", label: "คำถามที่พบบ่อย", Icon: CircleHelp },
        ].map(({ href, label, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex h-full flex-col items-center gap-1.5 rounded-xl border border-border p-2.5 hover:border-fg">
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {config && !config.enabled ? (
        <p className="mt-6 rounded-xl bg-surface-muted p-4 text-sm text-fg-muted">ขณะนี้แชทกับทีมงานปิดให้บริการชั่วคราว</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">ต้องการติดต่อเรื่องอะไร?</legend>
            <div className="flex flex-wrap gap-2">
              {(config?.topics ?? []).map((t) => (
                <label
                  key={t.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fg ${
                    topic === t.id ? "border-fg bg-fg text-canvas" : "border-border hover:border-fg"
                  }`}
                >
                  <input type="radio" name="topic" value={t.id} className="sr-only" checked={topic === t.id} onChange={() => { setTopic(t.id); setError(null); }} />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="support-first" className="mb-1.5 block text-sm font-semibold">
              รายละเอียด
            </label>
            <textarea
              id="support-first"
              rows={4}
              maxLength={max}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              placeholder="เช่น เลขคำสั่งซื้อ และสิ่งที่อยากให้ช่วย"
              className="w-full resize-none rounded-xl border-border bg-surface text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg"
            />
            <p className="mt-1 text-right text-[11px] text-fg-subtle">
              {message.length}/{max}
            </p>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-ink hover:bg-brand-hover disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            ส่งถึงทีมงาน
          </button>
        </form>
      )}
    </div>
  );
}

function Thread({ conv, config, onChange, onNew }) {
  const { socket, connected } = useChat();
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const listRef = useRef(null);
  const lastTyping = useRef(0);
  const typingTimer = useRef(null);
  const max = config?.maxMessageLength ?? 1000;
  const closed = conv.status === "closed";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [conv.messages?.length]);

  useEffect(() => {
    if (!socket || !connected) return undefined;
    socket.emit("support:join", conv.id);
    return () => socket.emit("support:leave", conv.id);
  }, [socket, connected, conv.id]);

  useSocketEvent(
    "support:typing",
    useCallback(
      (e) => {
        if (e.conversationId !== conv.id || !e.fromStaff) return;
        setTyping(e.name || "ทีมงาน");
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 3000);
      },
      [conv.id]
    )
  );

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await supportAPI.send(conv.id, body);
      setText("");
      onChange((c) => (c.messages.some((m) => m.id === message.id) ? c : { ...c, messages: [...c.messages, message] }));
    } catch (err) {
      setError(supportError(err, "ส่งไม่สำเร็จ"));
    } finally {
      setSending(false);
    }
  };

  const endChat = async () => {
    if (!window.confirm("จบการสนทนานี้?")) return;
    try {
      onChange(await supportAPI.get((await supportAPI.close(conv.id)).id));
    } catch (err) {
      setError(supportError(err));
    }
  };

  return (
    <>
      <ol ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-label="ข้อความ">
        {conv.messages?.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        {typing && <li className="text-xs text-fg-subtle">{typing} กำลังพิมพ์…</li>}
      </ol>
      {closed ? (
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-fg text-sm font-semibold text-canvas hover:bg-fg/85"
          >
            เริ่มบทสนทนาใหม่
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="border-t border-border p-3">
          {error && (
            <p role="alert" className="mb-2 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="support-reply" className="sr-only">
              พิมพ์ข้อความ
            </label>
            <textarea
              id="support-reply"
              rows={1}
              maxLength={max}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (socket && Date.now() - lastTyping.current > 2000) {
                  lastTyping.current = Date.now();
                  socket.emit("support:typing", conv.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
              }}
              placeholder="พิมพ์ข้อความ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl border-border bg-surface text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink hover:bg-brand-hover disabled:opacity-40"
              aria-label="ส่งข้อความ"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-fg-subtle">
            <button type="button" onClick={endChat} className="underline-offset-2 hover:text-fg hover:underline">
              จบการสนทนา
            </button>
            <span>
              {text.length}/{max}
            </span>
          </div>
        </form>
      )}
    </>
  );
}

export default function SupportWidget() {
  const { user } = useAuth();
  const { connected } = useChat();
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [conv, setConv] = useState(null);
  const [startNew, setStartNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cfg, current] = await Promise.all([supportAPI.config(), supportAPI.current()]);
      setConfig(cfg);
      setConv(current);
    } catch {
      // the panel shows the start form; errors appear when sending
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
    else {
      setConv(null);
      setConfig(null);
    }
  }, [user, load]);

  // Live updates for my conversation.
  useSocketEvent(
    "support:message",
    useCallback((m) => {
      setConv((c) => {
        if (!c || c.id !== m.conversationId || c.messages?.some((x) => x.id === m.id)) return c;
        return { ...c, messages: [...(c.messages ?? []), m] };
      });
      if (!openRef.current && m.senderRole === "agent") setUnread((n) => n + 1);
    }, [])
  );
  useSocketEvent(
    "support:conversation",
    useCallback((s) => setConv((c) => (c && c.id === s.id ? { ...c, ...s, messages: c.messages } : c)), [])
  );

  // Fallback when the socket is down: poll an open conversation.
  useEffect(() => {
    if (!user || connected || !conv || conv.status === "closed") return undefined;
    const t = setInterval(async () => {
      try {
        setConv(await supportAPI.get(conv.id));
      } catch {}
    }, POLL_MS);
    return () => clearInterval(t);
  }, [user, connected, conv?.id, conv?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    setUnread(0);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    setTimeout(() => panelRef.current?.querySelector("textarea, input, a, button")?.focus(), 50);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const showThread = conv && !(conv.status === "closed" && startNew);

  return (
    <>
      {open && (
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="support-title"
          className="fixed inset-x-2 bottom-2 top-20 z-[110] flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(620px,calc(100vh-8rem))] sm:w-[380px] lg:bottom-24"
        >
          <header className="flex items-center gap-3 bg-[#0f0f0f] px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink">
              <Headset className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="support-title" className="text-sm font-semibold">
                ติดต่อทีมงาน
              </h2>
              <p className="truncate text-xs text-white/70">
                <StatusLine conv={showThread ? conv : null} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-white"
              aria-label="ย่อหน้าต่างแชท"
            >
              <ChevronDown className="h-5 w-5 sm:hidden" aria-hidden />
              <X className="hidden h-5 w-5 sm:block" aria-hidden />
            </button>
          </header>

          {!user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <MessageCircle className="h-10 w-10 text-fg-subtle" aria-hidden />
              <p className="text-sm text-fg-muted">เข้าสู่ระบบเพื่อคุยกับทีมงาน เราจะได้ดูคำสั่งซื้อของคุณและช่วยได้ตรงจุด</p>
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(pathname || "/")}`}
                className="inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-semibold text-canvas"
              >
                เข้าสู่ระบบ
              </Link>
              <Link href="/faq" className="text-xs underline underline-offset-4">
                หรือดูคำถามที่พบบ่อย
              </Link>
            </div>
          ) : loading && !conv ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-fg-subtle" aria-label="กำลังโหลด" />
            </div>
          ) : showThread ? (
            <Thread
              conv={conv}
              config={config}
              onChange={(next) => setConv((c) => (typeof next === "function" ? next(c) : next))}
              onNew={() => setStartNew(true)}
            />
          ) : (
            <StartForm
              config={config}
              onStarted={(c) => {
                setConv(c);
                setStartNew(false);
              }}
            />
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "ปิดแชท" : unread ? `ติดต่อทีมงาน (${unread} ข้อความใหม่)` : "ติดต่อทีมงาน"}
        className={`fixed bottom-24 right-4 z-[105] h-14 items-center gap-2 rounded-full bg-fg pl-4 pr-5 text-sm font-semibold text-canvas shadow-lg transition-colors hover:bg-fg/85 lg:bottom-6 lg:right-6 ${
          open ? "hidden sm:inline-flex" : "inline-flex"
        }`}
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Headset className="h-5 w-5" aria-hidden />}
        <span className="hidden sm:inline">{open ? "ปิด" : "ติดต่อทีมงาน"}</span>
        {unread > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-brand-ink">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
