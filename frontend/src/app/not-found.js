import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-surface-muted">
      <h1 className="text-4xl font-extrabold text-red-600 mb-4">
        404 - Page Not Found
      </h1>
      <p className="text-fg mb-6">ขออภัย ไม่พบหน้าที่คุณต้องการ</p>
      <Link
        href="/"
        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
