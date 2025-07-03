export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <div className="animate-spin text-6xl mb-4">⏳</div>
      <p className="text-gray-700 text-lg">กำลังโหลดข้อมูล...</p>
    </div>
  );
}
