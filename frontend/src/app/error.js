"use client";
export default function Error({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        เกิดข้อผิดพลาด (500)
      </h1>
      <p className="text-gray-700 mb-6">
        {error?.message || "ขออภัย เกิดข้อผิดพลาดบางอย่าง"}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
      >
        ลองใหม่
      </button>
    </div>
  );
}
