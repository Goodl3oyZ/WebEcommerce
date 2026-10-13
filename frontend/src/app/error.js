"use client";

/** Unexpected error in a page: say so plainly and offer a retry. */
export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <svg viewBox="0 0 160 36" className="h-9 w-40 text-danger" aria-hidden>
        <path d="M0 20 H52 L58 20 L64 6 L70 32 L76 20 H160" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <h1 className="mt-6 font-display text-2xl font-semibold text-fg">เกิดข้อผิดพลาด</h1>
      <p className="mt-2 max-w-sm text-sm text-fg-muted">ระบบโหลดหน้านี้ไม่สำเร็จ ลองอีกครั้ง ถ้ายังไม่ได้ให้ติดต่อทีมงาน</p>
      {process.env.NODE_ENV !== "production" && error?.message && (
        <p className="mt-3 max-w-md break-words font-mono text-xs text-fg-subtle">{error.message}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-semibold text-canvas hover:bg-fg/85"
      >
        ลองอีกครั้ง
      </button>
    </div>
  );
}
