"use client";

import { useState } from "react";
import { adminAPI } from "@/lib/api/admin";
import { toast } from "react-hot-toast";
import {
  FaDatabase,
  FaMapMarkedAlt,
  FaShippingFast,
  FaBoxOpen,
  FaPlay,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTerminal,
} from "react-icons/fa";

export function SeedDataPanel() {
  const [loadingType, setLoadingType] = useState(null);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message: string }

  const handleSeed = async (seedType, label) => {
    setLoadingType(seedType);
    setStatus(null);
    setOutput(`[RUNNING] Executing seed: ${label}...\n`);

    try {
      // "address" only adds data; every other seed DELETES existing data
      // (including all users), so the API requires a typed confirmation.
      let confirmPhrase;
      if (seedType !== "address") {
        confirmPhrase = window.prompt(
          `Seed "${label}" จะลบข้อมูลเดิมทั้งหมด (รวมถึงผู้ใช้) พิมพ์ DELETE EXISTING DATA เพื่อยืนยัน`
        );
        if (confirmPhrase !== "DELETE EXISTING DATA") {
          setLoadingType(null);
          setOutput("[CANCELLED] Seed was not confirmed.\n");
          return;
        }
      }
      const res = await adminAPI.runSeed(seedType, confirmPhrase);
      if (res.success) {
        toast.success(`Seed ${label} สำเร็จ!`);
        setStatus({
          type: "success",
          message: res.message || `Seed ${label} ดำเนินการเรียบร้อยแล้ว`,
        });
        setOutput(
          (prev) => prev + `[SUCCESS] ${res.message}\n\n=== STDOUT / LOGS ===\n` + (res.output || "")
        );
      } else {
        toast.error(`Seed ${label} ไม่สำเร็จ`);
        setStatus({
          type: "error",
          message: res.message || "เกิดข้อผิดพลาดในการรัน Seed script",
        });
        setOutput(
          (prev) => prev + `[ERROR] ${res.message}\n\n=== STDOUT / STDERR ===\n` + (res.output || "")
        );
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Failed to execute seed";
      const errLogs = err.response?.data?.output || "";
      toast.error(`เกิดข้อผิดพลาด: ${errMsg}`);
      setStatus({
        type: "error",
        message: errMsg,
      });
      setOutput(
        (prev) => prev + `[ERROR] ${errMsg}\n\n=== DETAILS / LOGS ===\n` + errLogs
      );
    } finally {
      setLoadingType(null);
    }
  };

  const seedOptions = [
    {
      id: "address",
      title: "Seed ข้อมูลที่อยู่ประเทศไทย",
      description: "นำเข้าข้อมูล จังหวัด, อำเภอ, ตำบล และรหัสไปรษณีย์ จากไฟล์ CSV (seed-address-thai.js)",
      icon: FaMapMarkedAlt,
      badge: "seed-address-thai.js",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "shipping",
      title: "Seed ข้อมูลการจัดส่งและชำระเงิน",
      description: "นำเข้าช่องทางจัดส่ง (Flash, Kerry, EMS), พื้นที่จัดส่ง และช่องทางชำระเงิน (PromptPay, Credit Card, COD)",
      icon: FaShippingFast,
      badge: "seed-shipping-payment.js",
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      id: "main",
      title: "Seed ข้อมูลระบบพื้นฐาน",
      description: "นำเข้า หมวดหมู่สินค้า, แบรนด์, สินค้าตัวอย่าง, บัญชีผู้ใช้ทดสอบ (Admin/User), คูปองส่วนลด และออเดอร์ตัวอย่าง",
      icon: FaBoxOpen,
      badge: "seed.js",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      id: "all",
      title: "Seed ข้อมูลทั้งหมด (Run All)",
      description: "รัน Script Seed ทั้งหมดต่อเนื่องตามลำดับเพื่อรีเซ็ตระบบและสร้างข้อมูลทดสอบครบถ้วน",
      icon: FaDatabase,
      badge: "seed:all",
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaDatabase className="text-blue-600" />
            ระบบ Seed ข้อมูลเริ่มต้น (Database Seeder)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            เรียกใช้ Script สำหรับสร้างข้อมูลเริ่มต้นและข้อมูลทดสอบสำหรับระบบ e-Commerce
          </p>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {seedOptions.map((opt) => {
          const Icon = opt.icon;
          const isCurrentLoading = loadingType === opt.id;
          const isAnyLoading = loadingType !== null;

          return (
            <div
              key={opt.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">
                        {opt.title}
                      </h3>
                      <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {opt.badge}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  {opt.description}
                </p>
              </div>

              <button
                onClick={() => handleSeed(opt.id, opt.title)}
                disabled={isAnyLoading}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-white text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                  opt.color
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isCurrentLoading ? (
                  <>
                    <FaSpinner className="animate-spin w-4 h-4" />
                    กำลัง Seed ข้อมูล...
                  </>
                ) : (
                  <>
                    <FaPlay className="w-3.5 h-3.5" />
                    รัน Script
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Status Banner */}
      {status && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            status.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {status.type === "success" ? (
            <FaCheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <FaExclamationTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <h4 className="font-bold text-sm">
              {status.type === "success" ? "ดำเนินการสำเร็จ" : "เกิดข้อผิดพลาด"}
            </h4>
            <p className="text-xs mt-0.5">{status.message}</p>
          </div>
        </div>
      )}

      {/* Console Output Log */}
      {output && (
        <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 text-gray-200 shadow-inner">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-800 text-xs text-gray-400">
            <span className="flex items-center gap-2 font-mono">
              <FaTerminal className="text-green-400" /> Console Logs / Output
            </span>
            <button
              onClick={() => setOutput("")}
              className="hover:text-white transition-colors"
            >
              ล้าง Log
            </button>
          </div>
          <pre className="font-mono text-xs text-green-400 leading-relaxed overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
