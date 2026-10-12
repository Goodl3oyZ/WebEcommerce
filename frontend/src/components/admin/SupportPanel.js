"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Headset, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, useSocketEvent } from "@/contexts/ChatContext";
import { supportAPI, supportError } from "@/lib/api/support";

const isAdminRole = (role) => role === "admin" || role === "super_admin";
const STATUS = {
  waiting: { label: "รอรับเรื่อง", cls: "bg-warning-soft text-warning" },
  active: { label: "กำลังดูแล", cls: "bg-success-soft text-success" },
  closed: { label: "ปิดแล้ว", cls: "bg-surface-muted text-fg-muted" },
};
const FILTERS = [
  { id: "waiting", label: "รอรับ", params: { status: "waiting" } },
  { id: "mine", label: "ของฉัน", params: { status: "open", assigned: "me" } },
  { id: "open", label: "เปิดอยู่ทั้งหมด", params: { status: "open" } },
  { id: "closed", label: "ปิดแล้ว", params: { status: "closed" } },
];
const card = "rounded-2xl border border-border bg-surface";
const input =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg";

const ago = (d) => {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาที`;
  if (min < 1440) return `${Math.round(min / 60)} ชม.`;
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

function Badge({ status }) {
  const s = STATUS[status] ?? STATUS.closed;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

// ------------------------------------------------------------------ inbox

function Inbox({ me, topics }) {
  const { socket, connected } = useChat();
  const [filter, setFilter] = useState("waiting");
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef(null);
  const admin = isAdminRole(me.role);
  const topicLabel = useCallback((id) => topics.find((t) => t.id === id)?.label ?? id, [topics]);

  const loadList = useCallback(async () => {
    try {
      const params = FILTERS.find((f) => f.id === filter).params;
      const [rows, waiting, mine] = await Promise.all([
        supportAPI.list(params),
        supportAPI.list({ status: "waiting" }),
        supportAPI.list({ status: "open", assigned: "me" }),
      ]);
      setList(rows);
      setCounts({ waiting: waiting.length, mine: mine.length });
    } catch (e) {
      toast.error(supportError(e, "โหลดรายการแชทไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (admin) supportAPI.agents().then(setAgents).catch(() => {});
  }, [admin]);

  // Without a socket, refresh every 15 s.
  useEffect(() => {
    if (connected) return undefined;
    const t = setInterval(loadList, 15000);
    return () => clearInterval(t);
  }, [connected, loadList]);

  const openConversation = async (id) => {
    try {
      setSelected(await supportAPI.get(id));
    } catch (e) {
      toast.error(supportError(e));
    }
  };

  useEffect(() => {
    if (!socket || !connected || !selected?.id) return undefined;
    socket.emit("support:join", selected.id);
    return () => socket.emit("support:leave", selected.id);
  }, [socket, connected, selected?.id]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [selected?.messages?.length, selected?.id]);

  const refreshTimer = useRef(null);
  const refreshSoon = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(loadList, 300);
  }, [loadList]);

  useSocketEvent(
    "support:message",
    useCallback(
      (m) => {
        setSelected((c) =>
          c && c.id === m.conversationId && !c.messages.some((x) => x.id === m.id) ? { ...c, messages: [...c.messages, m] } : c
        );
        refreshSoon();
      },
      [refreshSoon]
    )
  );
  useSocketEvent(
    "support:conversation",
    useCallback(
      (s) => {
        setSelected((c) => (c && c.id === s.id ? { ...c, ...s, messages: c.messages } : c));
        refreshSoon();
      },
      [refreshSoon]
    )
  );
  useSocketEvent(
    "support:assigned",
    useCallback(() => toast("มีแชทใหม่ส่งมาให้คุณ", { icon: "💬" }), [])
  );

  const act = async (fn, done) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.id && selected?.id === res.id) setSelected(await supportAPI.get(res.id));
      if (done) toast.success(done);
      loadList();
    } catch (e) {
      toast.error(supportError(e));
    } finally {
      setBusy(false);
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = reply.trim();
    if (!body || !selected) return;
    setBusy(true);
    try {
      const m = await supportAPI.send(selected.id, body);
      setReply("");
      setSelected(await supportAPI.get(selected.id));
      if (!selected.messages.some((x) => x.id === m.id)) loadList();
    } catch (err) {
      toast.error(supportError(err, "ส่งไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const mineOrAdmin = selected && (selected.agent?.id === me.id || admin);
  const canReply = selected && selected.status !== "closed" && (!selected.agent || mineOrAdmin);

  return (
    <div className="grid min-h-[36rem] gap-4 lg:grid-cols-[22rem_1fr]">
      <section className={`${card} flex flex-col overflow-hidden ${selected ? "hidden lg:flex" : "flex"}`} aria-label="รายการแชท">
        <div className="flex gap-1 overflow-x-auto border-b border-border p-2" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.id ? "bg-fg text-canvas" : "text-fg-muted hover:bg-surface-muted"
              }`}
            >
              {f.label}
              {f.id === "waiting" && counts.waiting > 0 && <span className="ml-1">({counts.waiting})</span>}
              {f.id === "mine" && counts.mine > 0 && <span className="ml-1">({counts.mine})</span>}
            </button>
          ))}
        </div>
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {loading ? (
            <li className="flex justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-fg-subtle" aria-label="กำลังโหลด" />
            </li>
          ) : list.length === 0 ? (
            <li className="p-8 text-center text-sm text-fg-muted">ไม่มีแชทในรายการนี้</li>
          ) : (
            list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openConversation(c.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-surface-muted ${
                    selected?.id === c.id ? "bg-surface-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-fg">{c.customer?.name ?? "ลูกค้า"}</span>
                    <span className="shrink-0 text-[11px] text-fg-subtle">{ago(c.lastMessageAt)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge status={c.status} />
                    <span className="truncate text-[11px] text-fg-muted">{topicLabel(c.topic)}</span>
                  </div>
                  {c.lastMessage && (
                    <p className="mt-1 truncate text-xs text-fg-muted">
                      {c.lastMessage.senderRole === "agent" ? "คุณ/ทีม: " : ""}
                      {c.lastMessage.body}
                    </p>
                  )}
                  {c.agent && <p className="mt-0.5 text-[11px] text-fg-subtle">ผู้ดูแล: {c.agent.name}</p>}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className={`${card} flex flex-col overflow-hidden ${selected ? "flex" : "hidden lg:flex"}`} aria-label="บทสนทนา">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-fg-muted">
            <Headset className="h-10 w-10" aria-hidden />
            <p className="text-sm">เลือกแชทจากรายการด้านซ้าย</p>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-3 border-b border-border p-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-muted lg:hidden"
                aria-label="กลับไปที่รายการ"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-fg">{selected.customer?.name ?? "ลูกค้า"}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                  <Badge status={selected.status} />
                  {topicLabel(selected.topic)}
                  {selected.agent && <span>· ผู้ดูแล {selected.agent.name}</span>}
                  {selected.queuePosition && <span>· คิวที่ {selected.queuePosition}</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status !== "closed" && !selected.agent && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => supportAPI.claim(selected.id), "รับเรื่องแล้ว")}
                    className="rounded-lg bg-fg px-3 py-1.5 text-xs font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50"
                  >
                    รับเรื่อง
                  </button>
                )}
                {admin && selected.status !== "closed" && (
                  <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <span className="sr-only">มอบหมายให้</span>
                    <select
                      value={selected.agent?.id ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        act(() => supportAPI.assign(selected.id, e.target.value || null), e.target.value ? "มอบหมายแล้ว" : "ส่งกลับคิวแล้ว")
                      }
                      className="rounded-lg border-border bg-surface py-1.5 pl-2 pr-8 text-xs text-fg focus:border-fg focus:ring-fg"
                    >
                      <option value="">— ในคิว (ยังไม่มีผู้ดูแล) —</option>
                      {agents.map((a) => (
                        <option key={a.userId} value={a.userId}>
                          {a.name} ({a.active}/{a.effectiveLimit}){a.isAgent ? "" : " · ไม่ได้เป็นผู้ตอบแชท"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {selected.status !== "closed" && mineOrAdmin && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => window.confirm("ปิดเรื่องนี้?") && act(() => supportAPI.close(selected.id), "ปิดเรื่องแล้ว")}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg hover:bg-surface-muted disabled:opacity-50"
                  >
                    ปิดเรื่อง
                  </button>
                )}
              </div>
            </header>
            <ol ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {selected.messages.map((m) =>
                m.senderRole === "system" ? (
                  <li key={m.id} className="text-center text-[11px] text-fg-subtle">
                    {m.body} · {new Date(m.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  </li>
                ) : (
                  <li key={m.id} className={`flex flex-col ${m.senderRole === "agent" ? "items-end" : "items-start"}`}>
                    <span className="mb-1 text-[11px] text-fg-muted">
                      {m.senderName ?? (m.senderRole === "agent" ? "ทีมงาน" : "ลูกค้า")} ·{" "}
                      {new Date(m.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <p
                      className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                        m.senderRole === "agent" ? "rounded-br-md bg-fg text-canvas" : "rounded-bl-md bg-surface-muted text-fg"
                      }`}
                    >
                      {m.body}
                    </p>
                  </li>
                )
              )}
            </ol>
            {canReply ? (
              <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
                <label htmlFor="agent-reply" className="sr-only">
                  ตอบลูกค้า
                </label>
                <textarea
                  id="agent-reply"
                  rows={2}
                  value={reply}
                  onChange={(e) => {
                    setReply(e.target.value);
                    socket?.emit("support:typing", selected.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
                  }}
                  placeholder={selected.agent ? "พิมพ์คำตอบ… (Enter ส่ง)" : "ตอบเพื่อรับเรื่องนี้… (Enter ส่ง)"}
                  className={`${input} min-h-[3rem] flex-1 resize-none`}
                />
                <button
                  type="submit"
                  disabled={busy || !reply.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-fg text-canvas disabled:opacity-40"
                  aria-label="ส่ง"
                >
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </form>
            ) : (
              <p className="border-t border-border p-3 text-center text-xs text-fg-muted">
                {selected.status === "closed" ? "เรื่องนี้ปิดแล้ว" : `${selected.agent?.name} กำลังดูแลเรื่องนี้`}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// --------------------------------------------------------------- settings

function NumberField({ id, label, hint, value, onChange, min, max }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={`${input} mt-1.5`}
      />
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

function SupportSettings() {
  const [s, setS] = useState(null);
  const [agents, setAgents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newTopic, setNewTopic] = useState("");

  const load = useCallback(async () => {
    try {
      const [settings, roster] = await Promise.all([supportAPI.settings(), supportAPI.agents()]);
      setS(settings);
      setAgents(roster);
    } catch (e) {
      toast.error(supportError(e, "โหลดการตั้งค่าไม่สำเร็จ"));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!s) return <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-fg-subtle" aria-label="กำลังโหลด" />;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { enabled, assignmentMode, maxActivePerAgent, messagesPerMinute, maxUnanswered, maxMessageLength, topics } = s;
      setS(await supportAPI.updateSettings({ enabled, assignmentMode, maxActivePerAgent, messagesPerMinute, maxUnanswered, maxMessageLength, topics }));
      setAgents(await supportAPI.agents());
      toast.success("บันทึกการตั้งค่าแชทแล้ว");
    } catch (err) {
      toast.error(supportError(err, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  const updateAgent = async (a, changes) => {
    try {
      const updated = await supportAPI.updateAgent(a.userId, changes);
      setAgents((list) => list.map((x) => (x.userId === a.userId ? updated : x)));
    } catch (err) {
      toast.error(supportError(err));
    }
  };

  const addTopic = () => {
    const label = newTopic.trim();
    if (!label) return;
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "topic";
    let id = base.slice(0, 24);
    for (let n = 2; s.topics.some((t) => t.id === id); n += 1) id = `${base.slice(0, 20)}-${n}`;
    setS((x) => ({ ...x, topics: [...x.topics, { id, label }] }));
    setNewTopic("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={save} className={`${card} space-y-6 p-5`}>
        <h3 className="font-semibold text-fg">การทำงานของแชท</h3>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => setS((x) => ({ ...x, enabled: e.target.checked }))}
            className="h-4 w-4 rounded border-border text-fg focus:ring-fg"
          />
          <span className="font-medium text-fg">เปิดให้ลูกค้าเริ่มแชทใหม่</span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-fg">การแบ่งงาน</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ["auto", "อัตโนมัติ", "ส่งให้ผู้ตอบแชทที่ว่างที่สุดทันที จนครบจำนวนต่อคน"],
              ["manual", "มอบหมายเอง", "เข้าคิวไว้ ทีมงานกดรับเอง หรือแอดมินเลือกคนให้"],
            ].map(([value, title, hint]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border p-3 text-sm ${s.assignmentMode === value ? "border-fg ring-1 ring-fg" : "border-border"}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={s.assignmentMode === value}
                  onChange={() => setS((x) => ({ ...x, assignmentMode: value }))}
                  className="mr-2 h-4 w-4 border-border text-fg focus:ring-fg"
                />
                <span className="font-semibold text-fg">{title}</span>
                <span className="mt-1 block text-xs text-fg-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            id="cap"
            label="แชทพร้อมกันต่อคน (ค่าเริ่มต้น)"
            hint="ตั้งรายคนได้ในตารางผู้ตอบแชท"
            min={1}
            max={50}
            value={s.maxActivePerAgent}
            onChange={(v) => setS((x) => ({ ...x, maxActivePerAgent: v }))}
          />
          <NumberField
            id="len"
            label="ความยาวข้อความสูงสุด (ตัวอักษร)"
            min={50}
            max={4000}
            value={s.maxMessageLength}
            onChange={(v) => setS((x) => ({ ...x, maxMessageLength: v }))}
          />
          <NumberField
            id="rate"
            label="ข้อความต่อนาทีของลูกค้า"
            hint="กันการส่งรัว ๆ"
            min={1}
            max={60}
            value={s.messagesPerMinute}
            onChange={(v) => setS((x) => ({ ...x, messagesPerMinute: v }))}
          />
          <NumberField
            id="unanswered"
            label="ส่งติดกันได้สูงสุด ก่อนทีมงานตอบ"
            hint="เกินนี้ลูกค้าต้องรอคำตอบก่อน"
            min={1}
            max={50}
            value={s.maxUnanswered}
            onChange={(v) => setS((x) => ({ ...x, maxUnanswered: v }))}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-fg">หัวข้อที่ลูกค้าเลือกได้ (ขอบเขตการถาม)</legend>
          <ul className="mt-2 space-y-2">
            {s.topics.map((t, i) => (
              <li key={t.id} className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`topic-${t.id}`}>
                  ชื่อหัวข้อ
                </label>
                <input
                  id={`topic-${t.id}`}
                  value={t.label}
                  maxLength={60}
                  onChange={(e) =>
                    setS((x) => ({ ...x, topics: x.topics.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) }))
                  }
                  className={input}
                />
                <button
                  type="button"
                  disabled={s.topics.length <= 1}
                  onClick={() => setS((x) => ({ ...x, topics: x.topics.filter((_, j) => j !== i) }))}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-danger hover:bg-danger-soft disabled:opacity-30"
                  aria-label={`ลบหัวข้อ ${t.label}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <label htmlFor="new-topic" className="sr-only">
              หัวข้อใหม่
            </label>
            <input
              id="new-topic"
              value={newTopic}
              maxLength={60}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic();
                }
              }}
              placeholder="เพิ่มหัวข้อ เช่น การคืนสินค้า"
              className={input}
            />
            <button type="button" onClick={addTopic} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border px-3 text-sm text-fg hover:bg-surface-muted">
              <Plus className="h-4 w-4" aria-hidden /> เพิ่ม
            </button>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </form>

      <section className={`${card} p-5`} aria-labelledby="agents-title">
        <h3 id="agents-title" className="font-semibold text-fg">
          ผู้ตอบแชท
        </h3>
        <p className="mt-1 text-xs text-fg-muted">
          บัญชีที่มีสิทธิ์ admin หรือ moderator เปิด &quot;ผู้ตอบแชท&quot; เพื่อให้รับแชทได้ (เพิ่มสิทธิ์ moderator ได้ที่เมนูผู้ใช้)
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-fg-muted">
              <tr>
                <th className="py-2 font-medium">ชื่อ</th>
                <th className="py-2 font-medium">ผู้ตอบแชท</th>
                <th className="py-2 font-medium">พร้อมรับ</th>
                <th className="py-2 font-medium">รับได้ (คน)</th>
                <th className="py-2 text-right font-medium">กำลังดูแล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((a) => (
                <tr key={a.userId}>
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium text-fg">{a.name}</span>
                    <span className="text-xs text-fg-subtle">{a.role}</span>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${a.name} เป็นผู้ตอบแชท`}
                      checked={a.isAgent}
                      onChange={(e) => updateAgent(a, { isAgent: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-fg focus:ring-fg"
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${a.name} พร้อมรับแชท`}
                      checked={a.accepting}
                      disabled={!a.isAgent}
                      onChange={(e) => updateAgent(a, { accepting: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-fg focus:ring-fg disabled:opacity-30"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      disabled={!a.isAgent}
                      aria-label={`จำนวนแชทพร้อมกันของ ${a.name}`}
                      placeholder={`${s.maxActivePerAgent} (ค่าเริ่มต้น)`}
                      defaultValue={a.maxActive ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== a.maxActive) updateAgent(a, { maxActive: v });
                      }}
                      className="w-28 rounded-lg border-border bg-surface px-2 py-1 text-sm text-fg focus:border-fg focus:ring-fg disabled:opacity-30"
                    />
                  </td>
                  <td className="text-right tabular-nums text-fg">
                    {a.active}/{a.effectiveLimit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ panel

export function SupportPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState("inbox");
  const [me, setMe] = useState(null);
  const [topics, setTopics] = useState([]);
  const admin = isAdminRole(user?.role);

  const loadMe = useCallback(async () => {
    try {
      const [cfg, mine] = await Promise.all([supportAPI.config(), supportAPI.me()]);
      setTopics(cfg.topics ?? []);
      setMe(mine);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) loadMe();
  }, [user, loadMe]);

  const toggleAvailability = async () => {
    try {
      setMe(await supportAPI.setAvailability(!(me?.isAgent && me?.accepting)));
    } catch (e) {
      toast.error(supportError(e));
    }
  };

  const available = me?.isAgent && me?.accepting;
  const meUser = useMemo(() => ({ id: user?.id, role: user?.role }), [user?.id, user?.role]);
  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-fg">แชทลูกค้า</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAvailability}
            aria-pressed={Boolean(available)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
              available ? "border-success bg-success-soft text-success" : "border-border text-fg-muted hover:bg-surface-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${available ? "bg-success" : "bg-fg-subtle"}`} aria-hidden />
            {available ? "พร้อมรับแชท" : "ไม่รับแชทใหม่"}
            {me?.isAgent && <span className="text-xs">({me.active}/{me.effectiveLimit})</span>}
          </button>
          {admin && (
            <div className="flex rounded-xl border border-border p-1" role="tablist">
              {[
                ["inbox", "กล่องแชท"],
                ["settings", "ตั้งค่าแชท"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? "bg-fg text-canvas" : "text-fg-muted hover:bg-surface-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {tab === "settings" && admin ? <SupportSettings /> : <Inbox me={meUser} topics={topics} />}
    </div>
  );
}
