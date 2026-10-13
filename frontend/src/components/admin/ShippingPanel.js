import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminAPI, addressAPI } from "@/lib/api";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

const emptyMethod = { name: "", code: "", price: "", description: "", shippingZoneId: "" };
const emptyZone = { name: "", baseCost: "", description: "", provinces: [] };

/** Checkbox list of provinces; shows which other zone currently serves each one. */
function ProvincePicker({ all, value, onChange, owners }) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const shown = all.filter((p) => p.includes(query.trim()));
  const toggle = (name) =>
    onChange(selected.has(name) ? value.filter((p) => p !== name) : [...value, name]);
  const moving = value.filter((p) => owners[p]);

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-fg">
          จังหวัดในโซนนี้ ({value.length})
        </span>
        <input
          className="min-w-0 flex-1 rounded-xl border border-border px-3 py-1.5 text-sm"
          placeholder="ค้นหาจังหวัด"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="text-sm text-info hover:underline"
          onClick={() => onChange([...new Set([...value, ...shown])])}
        >
          เลือกทั้งหมดที่แสดง
        </button>
        <button
          type="button"
          className="text-sm text-fg-muted hover:underline"
          onClick={() => onChange(value.filter((p) => !shown.includes(p)))}
        >
          ล้าง
        </button>
      </div>
      <div className="grid max-h-64 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((name) => (
          <label key={name} className="flex items-start gap-2 text-sm text-fg">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={selected.has(name)}
              onChange={() => toggle(name)}
            />
            <span>
              {name}
              {owners[name] && (
                <span className="block text-xs text-fg-muted">{owners[name]}</span>
              )}
            </span>
          </label>
        ))}
        {shown.length === 0 && (
          <p className="col-span-full text-sm text-fg-muted">ไม่พบจังหวัด</p>
        )}
      </div>
      {moving.length > 0 && (
        <p className="text-xs text-fg-muted">
          {moving.length} จังหวัดจะถูกย้ายมาจากโซนเดิม พร้อมที่อยู่ลูกค้าในจังหวัดนั้น
        </p>
      )}
    </div>
  );
}

export function ShippingPanel() {
  const [methods, setMethods] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [methodForm, setMethodForm] = useState(emptyMethod);
  const [zoneForm, setZoneForm] = useState(emptyZone);
  const [editingMethod, setEditingMethod] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [allProvinces, setAllProvinces] = useState([]);

  useEffect(() => {
    addressAPI
      .getProvinces()
      .then((rows) =>
        setAllProvinces(
          (Array.isArray(rows) ? rows : []).map((p) => p.nameTh).filter(Boolean)
        )
      )
      .catch(() => setAllProvinces([]));
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([adminAPI.getShippingMethods(), adminAPI.getShippingZones()])
      .then(([methodsData, zonesData]) => {
        const methodsList = Array.isArray(methodsData)
          ? methodsData
          : methodsData?.methods || [];
        const zonesList = Array.isArray(zonesData)
          ? zonesData
          : zonesData?.zones || [];
        setMethods(methodsList);
        setZones(zonesList);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch shipping data");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const saveMethod = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: methodForm.name.trim(),
        code: methodForm.code.trim().toUpperCase(),
        price: Number(methodForm.price),
        description: methodForm.description || undefined,
        // A method is only offered to addresses in its zone.
        shippingZoneId: methodForm.shippingZoneId,
      };
      if (editingMethod) {
        await adminAPI.updateShippingMethod(editingMethod.id, payload);
        toast.success("อัปเดตวิธีจัดส่งแล้ว");
      } else {
        await adminAPI.createShippingMethod(payload);
        toast.success("เพิ่มวิธีจัดส่งแล้ว");
      }
      setMethodForm(emptyMethod);
      setEditingMethod(null);
      load();
    } catch (err) {
      toast.error(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const saveZone = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: zoneForm.name.trim(),
        baseCost: Number(zoneForm.baseCost),
        description: zoneForm.description || undefined,
        provinces: zoneForm.provinces,
      };
      if (editingZone) {
        await adminAPI.updateShippingZone(editingZone.id, payload);
        toast.success("อัปเดตโซนแล้ว");
      } else {
        await adminAPI.createShippingZone(payload);
        toast.success("เพิ่มโซนแล้ว");
      }
      setZoneForm(emptyZone);
      setEditingZone(null);
      load();
    } catch (err) {
      toast.error(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const removeMethod = async (row) => {
    if (!confirm(`ปิดใช้งานวิธีจัดส่ง "${row.name}" ?`)) return;
    try {
      await adminAPI.deleteShippingMethod(row.id);
      toast.success("ปิดใช้งานแล้ว");
      load();
    } catch (err) {
      toast.error(err.message || "ดำเนินการไม่สำเร็จ");
    }
  };

  const removeZone = async (row) => {
    if (!confirm(`ปิดใช้งานโซน "${row.name}" ?`)) return;
    try {
      await adminAPI.deleteShippingZone(row.id);
      toast.success("ปิดใช้งานแล้ว");
      load();
    } catch (err) {
      toast.error(err.message || "ดำเนินการไม่สำเร็จ");
    }
  };

  const methodColumns = [
    { key: "name", header: "ชื่อ" },
    { key: "code", header: "รหัส" },
    { key: "price", header: "ราคา" },
    {
      key: "isActive",
      header: "สถานะ",
      render: (m) => (m.isActive ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      header: "จัดการ",
      render: (m) => (
        <div className="flex justify-end gap-2 md:justify-start">
          <button
            type="button"
            className="text-info hover:underline"
            onClick={() => {
              setEditingMethod(m);
              setMethodForm({
                name: m.name || "",
                code: m.code || "",
                price: m.price || "",
                description: m.description || "",
                shippingZoneId: m.shippingZoneId || "",
              });
            }}
          >
            แก้ไข
          </button>
          <button
            type="button"
            className="text-danger hover:underline"
            onClick={() => removeMethod(m)}
          >
            ปิดใช้งาน
          </button>
        </div>
      ),
    },
  ];

  const zoneColumns = [
    { key: "name", header: "ชื่อ" },
    { key: "baseCost", header: "ค่าส่งพื้นฐาน", render: (z) => z.baseCost },
    {
      key: "provinces",
      header: "จังหวัด",
      render: (z) => `${z.provinces?.length ?? 0} จังหวัด`,
    },
    {
      key: "isActive",
      header: "สถานะ",
      render: (z) => (z.isActive ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      header: "จัดการ",
      render: (z) => (
        <div className="flex justify-end gap-2 md:justify-start">
          <button
            type="button"
            className="text-info hover:underline"
            onClick={() => {
              setEditingZone(z);
              setZoneForm({
                name: z.name || "",
                baseCost: z.baseCost || "",
                description: z.description || "",
                provinces: z.provinces || [],
              });
            }}
          >
            แก้ไข
          </button>
          <button
            type="button"
            className="text-danger hover:underline"
            onClick={() => removeZone(z)}
          >
            ปิดใช้งาน
          </button>
        </div>
      ),
    },
  ];

  // Province -> the other zone serving it now (shown in the picker).
  const owners = {};
  for (const z of zones) {
    if (editingZone && z.id === editingZone.id) continue;
    for (const p of z.provinces || []) {
      owners[p] = z.isActive === false ? `${z.name} (ปิดใช้งาน)` : z.name;
    }
  }
  const served = new Set(
    zones.filter((z) => z.isActive !== false).flatMap((z) => z.provinces || [])
  );
  const unserved = allProvinces.filter((p) => !served.has(p));

  if (loading) return <PanelSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-fg">การจัดส่ง</h2>

      <section className="rounded-2xl border border-border p-4">
        <h3 className="mb-3 font-semibold text-fg">
          {editingMethod ? "แก้ไขวิธีจัดส่ง" : "เพิ่มวิธีจัดส่ง"}
        </h3>
        <form onSubmit={saveMethod} className="grid gap-3 sm:grid-cols-2">
          <input
            required
            className="rounded-xl border border-border px-3 py-2"
            placeholder="ชื่อ"
            value={methodForm.name}
            onChange={(e) =>
              setMethodForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <input
            required
            className="rounded-xl border border-border px-3 py-2"
            placeholder="รหัส เช่น EXPRESS"
            value={methodForm.code}
            onChange={(e) =>
              setMethodForm((f) => ({ ...f, code: e.target.value }))
            }
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2"
            placeholder="ราคา"
            value={methodForm.price}
            onChange={(e) =>
              setMethodForm((f) => ({ ...f, price: e.target.value }))
            }
          />
          <select
            required
            className="rounded-xl border border-border px-3 py-2"
            value={methodForm.shippingZoneId}
            onChange={(e) =>
              setMethodForm((f) => ({ ...f, shippingZoneId: e.target.value }))
            }
          >
            <option value="">เลือกโซนจัดส่ง</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
                {z.isActive === false ? " (ปิดใช้งาน)" : ""}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-border px-3 py-2"
            placeholder="คำอธิบาย"
            value={methodForm.description}
            onChange={(e) =>
              setMethodForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-fg px-4 py-2 text-canvas disabled:opacity-60"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            {editingMethod && (
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2"
                onClick={() => {
                  setEditingMethod(null);
                  setMethodForm(emptyMethod);
                }}
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-fg">วิธีการจัดส่ง</h3>
        {methods.length === 0 ? (
          <EmptyState title="ยังไม่มีวิธีการจัดส่ง" description="เพิ่มวิธีจัดส่งด้านบน" />
        ) : (
          <ResponsiveTable columns={methodColumns} data={methods} />
        )}
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h3 className="mb-3 font-semibold text-fg">
          {editingZone ? "แก้ไขโซนจัดส่ง" : "เพิ่มโซนจัดส่ง"}
        </h3>
        <form onSubmit={saveZone} className="grid gap-3 sm:grid-cols-2">
          <input
            required
            className="rounded-xl border border-border px-3 py-2"
            placeholder="ชื่อโซน"
            value={zoneForm.name}
            onChange={(e) =>
              setZoneForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2"
            placeholder="ค่าส่งพื้นฐาน"
            value={zoneForm.baseCost}
            onChange={(e) =>
              setZoneForm((f) => ({ ...f, baseCost: e.target.value }))
            }
          />
          <input
            className="rounded-xl border border-border px-3 py-2 sm:col-span-2"
            placeholder="คำอธิบาย"
            value={zoneForm.description}
            onChange={(e) =>
              setZoneForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          {allProvinces.length > 0 && (
            <ProvincePicker
              all={allProvinces}
              value={zoneForm.provinces}
              owners={owners}
              onChange={(provinces) => setZoneForm((f) => ({ ...f, provinces }))}
            />
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-fg px-4 py-2 text-canvas disabled:opacity-60"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            {editingZone && (
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2"
                onClick={() => {
                  setEditingZone(null);
                  setZoneForm(emptyZone);
                }}
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-fg">โซนจัดส่ง</h3>
        {unserved.length > 0 && (
          <div className="mb-3 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-fg">
            <p className="font-medium">
              {unserved.length} จังหวัดยังไม่มีโซนที่เปิดใช้งาน ลูกค้าในจังหวัดเหล่านี้จะสั่งซื้อไม่ได้
            </p>
            <p className="mt-1 text-fg-muted">{unserved.join(", ")}</p>
          </div>
        )}
        {zones.length === 0 ? (
          <EmptyState title="ยังไม่มีโซนจัดส่ง" description="เพิ่มโซนด้านบน" />
        ) : (
          <ResponsiveTable columns={zoneColumns} data={zones} />
        )}
      </section>
    </div>
  );
}
