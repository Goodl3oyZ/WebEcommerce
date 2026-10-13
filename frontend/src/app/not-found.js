import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-[clamp(5rem,18vw,10rem)] font-bold leading-none tracking-tighter text-fg">404</p>
      <svg viewBox="0 0 160 20" className="mt-2 h-5 w-40 text-fg-subtle" aria-hidden>
        <path d="M0 10 H160" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>
      <h1 className="mt-4 font-display text-2xl font-semibold text-fg">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="mt-2 max-w-sm text-sm text-fg-muted">ลิงก์อาจเปลี่ยนไปหรือหน้านี้ถูกนำออกแล้ว ลองค้นหาสินค้าหรือกลับไปหน้าแรก</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-semibold text-canvas hover:bg-fg/85">
          กลับหน้าแรก
        </Link>
        <Link href="/products" className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold text-fg hover:border-fg">
          ดูสินค้าทั้งหมด
        </Link>
      </div>
    </div>
  );
}
