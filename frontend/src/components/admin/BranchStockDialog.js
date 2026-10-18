"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FaPlusCircle, FaTimes } from "react-icons/fa";
import { adminAPI } from "@/lib/api/admin";
import { productsAPI } from "@/lib/api";

const input =
  "block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg";
const errorText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
const variantName = (v) => [v?.color, v?.size].filter(Boolean).join(" / ") || "แบบเดียว";

/** Pick a product (search) and one of its variants that the branch does not stock yet. */
function AddStockForm({ storeId, stocked, onAdded }) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      productsAPI
        .getAllProducts({ search: search.trim() || undefined, limit: 20, includeInactive: "true" })
        .then((res) => active && setProducts(res?.products ?? []))
        .catch(() => active && setProducts([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const product = products.find((p) => p.id === productId);
  const variants = (product?.variants ?? []).filter((v) => !stocked.has(v.id));

  const add = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!product || !variantId) return toast.error("เลือกสินค้าและแบบก่อน");
    if (!Number.isInteger(qty) || qty < 0) return toast.error("จำนวนต้องเป็นเลขจำนวนเต็ม 0 ขึ้นไป");
    setSaving(true);
    try {
      await adminAPI.addBranchStock({ storeId, productId: product.id, variantId, quantity: qty });
      toast.success("เพิ่มสินค้าในสาขาแล้ว");
      setVariantId("");
      setQuantity("1");
      onAdded();
    } catch (err) {
      toast.error(errorText(err, "เพิ่มไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={add} className="grid gap-3 rounded-xl bg-surface-muted p-4 sm:grid-cols-2">
      <p className="text-sm font-semibold text-fg sm:col-span-2">เพิ่มสินค้าเข้าสาขา</p>
      <label className="text-xs font-medium text-fg-muted sm:col-span-2">
        ค้นหาสินค้า
        <input className={`${input} mt-1`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ชื่อสินค้า" />
      </label>
      <label className="text-xs font-medium text-fg-muted">
        สินค้า
        <select
          className={`${input} mt-1`}
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setVariantId("");
          }}
        >
          <option value="">เลือกสินค้า</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-fg-muted">
        แบบ (สี / ไซซ์)
        <select className={`${input} mt-1`} value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!product}>
          <option value="">{product && variants.length === 0 ? "สาขามีครบทุกแบบแล้ว" : "เลือกแบบ"}</option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {variantName(v)}
              {v.sku ? ` · ${v.sku}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-fg-muted">
        จำนวนที่มีในสาขา
        <input className={`${input} mt-1`} type="number" min={0} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={saving || !variantId}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-fg px-4 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50"
        >
          <FaPlusCircle aria-hidden /> {saving ? "กำลังเพิ่ม…" : "เพิ่ม"}
        </button>
      </div>
    </form>
  );
}

/** One stocked variant; the count is saved when it changes. */
function StockRow({ item, onSaved }) {
  const [value, setValue] = useState(String(item.quantity));
  const [saving, setSaving] = useState(false);
  const dirty = value !== String(item.quantity);

  const save = async () => {
    const qty = Number(value);
    if (!Number.isInteger(qty) || qty < 0) {
      toast.error("จำนวนต้องเป็นเลขจำนวนเต็ม 0 ขึ้นไป");
      return;
    }
    setSaving(true);
    try {
      await adminAPI.setBranchStock(item.id, qty);
      toast.success("บันทึกจำนวนแล้ว");
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate font-medium text-fg">{item.product?.name ?? "สินค้าถูกลบ"}</p>
        <p className="truncate text-xs text-fg-muted">
          {variantName(item.variant)}
          {item.variant?.sku ? ` · ${item.variant.sku}` : ""}
        </p>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) save();
        }}
      >
        {item.quantity === 0 && !dirty && (
          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">หมด</span>
        )}
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={`จำนวน ${item.product?.name ?? ""} ${variantName(item.variant)}`}
          className={`${input} w-24 text-right`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="submit"
          disabled={!dirty || saving}
          className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-fg hover:bg-surface-muted disabled:opacity-40"
        >
          {saving ? "…" : "บันทึก"}
        </button>
      </form>
    </li>
  );
}

/** A branch's own shelf: what it holds, used for pickup orders at that branch. */
export function BranchStockDialog({ store, onClose }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = () =>
    adminAPI
      .getBranchStock(store.id, { page })
      .then((res) => {
        setItems(res?.items ?? []);
        setPagination(res?.pagination ?? { page: 1, pages: 1, total: 0 });
      })
      .catch((err) => toast.error(errorText(err, "โหลดสต็อกไม่สำเร็จ")))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the page changes
  }, [store.id, page]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stocked = new Set(items.map((i) => i.variant?.id ?? i.variantId));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-stock-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="branch-stock-title" className="text-lg font-bold text-fg">
              สต็อก {store.name}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              ลูกค้าเลือกรับที่สาขานี้ได้เมื่อสาขามีสินค้าครบตามตะกร้า ออเดอร์รับที่สาขาตัดจากจำนวนนี้ ไม่ตัดสต็อกออนไลน์
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full p-2 text-fg-subtle hover:bg-fg/5 hover:text-fg">
            <FaTimes aria-hidden />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <AddStockForm storeId={store.id} stocked={stocked} onAdded={load} />
          <section aria-label="สินค้าในสาขา">
            <p className="text-sm font-semibold text-fg">สินค้าในสาขา ({pagination.total ?? items.length})</p>
            {loading ? (
              <div className="mt-3 space-y-2" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-muted" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-muted">ยังไม่มีสินค้าในสาขานี้ ลูกค้าจะยังเลือกรับที่สาขานี้ไม่ได้</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <StockRow key={`${item.id}:${item.quantity}`} item={item} onSaved={load} />
                ))}
              </ul>
            )}
            {pagination.pages > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <button type="button" className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ก่อนหน้า
                </button>
                <span className="text-fg-muted">
                  หน้า {page} / {pagination.pages}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
