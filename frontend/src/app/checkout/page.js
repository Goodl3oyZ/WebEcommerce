"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Check, CreditCard, Loader2, Lock, MapPin, QrCode, Tag, Truck, X } from "lucide-react";
import { addressAPI, cartAPI, couponsAPI, orderAPI, paymentsAPI, shippingAPI } from "@/lib/api";
import { createCardToken } from "@/lib/omise";
import { couponErrorMessage } from "@/lib/api/coupons";
import CouponList, { useAvailableCoupons } from "@/components/shop/CouponList";
import useCartStore from "@/store/cartStore";
import Container from "@/components/shop/Container";
import ProductImage from "@/components/ui/ProductImage";
import { Button, buttonClasses } from "@/components/ui/Button";
import { formatTHB, fromSatang, toSatang } from "@/lib/format";
import { variantLabel } from "@/components/shop/productData";

// Must match backend/src/services/orderService.js (VAT on subtotal − discount).
const VAT_PERCENT = 7;
const QR_POLL_MS = 4000;

const METHOD_UI = {
  card: { Icon: CreditCard, hint: "Visa / Mastercard / JCB ผ่าน Omise" },
  promptpay: { Icon: QrCode, hint: "สแกน QR ด้วยแอปธนาคาร" },
};

const OMISE_ERRORS = {
  "number is invalid": "หมายเลขบัตรไม่ถูกต้อง",
  "brand not supported": "ไม่รองรับบัตรประเภทนี้ กรุณาใช้บัตรอื่น",
  "expiration month is invalid": "เดือนหมดอายุไม่ถูกต้อง",
  "expiration_month is invalid": "เดือนหมดอายุไม่ถูกต้อง",
  "expiration year is invalid": "ปีหมดอายุไม่ถูกต้อง",
  "expiration_year is invalid": "ปีหมดอายุไม่ถูกต้อง",
  "security code is invalid": "รหัส CVC ไม่ถูกต้อง",
  "name is invalid": "ชื่อบนบัตรไม่ถูกต้อง",
  "network error": "เชื่อมต่อระบบชำระเงินไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต",
};
const cardErrorMessage = (msg = "") => {
  const lower = msg.toLowerCase();
  const key = Object.keys(OMISE_ERRORS).find((k) => lower.includes(k));
  return key ? OMISE_ERRORS[key] : msg || "ตรวจสอบข้อมูลบัตรอีกครั้ง";
};
const apiMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const methodKey = (m) => (m?.code || "").toLowerCase();

function validateCard({ number, name, expiry, cvc }) {
  const errors = {};
  const digits = number.replace(/\s/g, "");
  if (digits.length < 13 || digits.length > 19) errors.number = "หมายเลขบัตรต้องมี 13–19 หลัก";
  if (!name.trim()) errors.name = "กรุณากรอกชื่อบนบัตร";
  if (!/^\d{2}\/\d{2}$/.test(expiry)) errors.expiry = "รูปแบบ ดด/ปป";
  else {
    const [mm, yy] = expiry.split("/").map(Number);
    const now = new Date();
    const year = 2000 + yy;
    if (mm < 1 || mm > 12) errors.expiry = "เดือนต้องอยู่ระหว่าง 01–12";
    else if (year < now.getFullYear() || (year === now.getFullYear() && mm < now.getMonth() + 1))
      errors.expiry = "บัตรหมดอายุแล้ว";
  }
  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = "CVC 3–4 หลัก";
  return errors;
}

function Step({ n, title, Icon, children, action }) {
  return (
    <section aria-labelledby={`step-${n}`} className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={`step-${n}`} className="flex items-center gap-3 text-base font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fg text-xs font-bold text-canvas">{n}</span>
          <Icon className="h-4 w-4 text-fg-muted" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChoiceCard({ name, value, checked, onChange, children }) {
  return (
    <label
      className={`relative flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
        checked ? "border-fg bg-fg/[0.03] ring-1 ring-fg" : "border-border hover:border-fg/50"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 focus:ring-fg" />
      <span className="min-w-0 flex-1 text-sm">{children}</span>
    </label>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (error) =>
  `h-11 w-full rounded-lg bg-surface px-3 text-sm focus:ring-fg ${error ? "border-danger focus:border-danger" : "border-border focus:border-fg"}`;

export default function CheckoutPage() {
  const router = useRouter();
  const refreshCartBadge = useCartStore((s) => s.fetchCartFromBackend);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [shipping, setShipping] = useState({ loading: false, options: [], error: null });
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvc: "" });
  const [cardErrors, setCardErrors] = useState({});
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponState, setCouponState] = useState({ loading: false, error: null });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [qr, setQr] = useState(null); // { orderId, url, total }
  const [cancelling, setCancelling] = useState(false);
  const available = useAvailableCoupons();
  // One key per checkout attempt: a resend after a network drop returns the same
  // order on the server instead of creating (and charging) a second one.
  const attemptKey = useRef(null);
  const newAttemptKey = () => {
    attemptKey.current = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  };

  // Initial data
  useEffect(() => {
    (async () => {
      try {
        const [cartRes, addrRes, methods] = await Promise.all([
          cartAPI.getCart(),
          addressAPI.getAddresses(),
          paymentsAPI.getPaymentMethods(),
        ]);
        setCart({ items: cartRes.items ?? [], subtotal: Number(cartRes.subtotal ?? 0) });
        const list = addrRes.addresses ?? [];
        setAddresses(list);
        setAddressId((list.find((a) => a.isDefault) || list[0])?.id ?? "");
        const pm = Array.isArray(methods) ? methods : methods?.data ?? [];
        setPaymentMethods(pm);
        setPaymentMethodId(pm[0]?.id ?? "");
      } catch (e) {
        setLoadError(apiMessage(e, "โหลดข้อมูลไม่สำเร็จ"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Shipping options for the chosen address (the same calculation checkout uses).
  useEffect(() => {
    if (!addressId) {
      setShipping({ loading: false, options: [], error: null });
      setShippingMethodId("");
      return;
    }
    let active = true;
    setShipping((s) => ({ ...s, loading: true, error: null }));
    shippingAPI
      .calculateShippingCost(addressId, [])
      .then((options) => {
        if (!active) return;
        const list = Array.isArray(options) ? options : [];
        setShipping({ loading: false, options: list, error: list.length ? null : "ไม่มีวิธีจัดส่งสำหรับที่อยู่นี้" });
        setShippingMethodId(list[0]?.methodId ?? "");
      })
      .catch((e) => {
        if (!active) return;
        setShipping({ loading: false, options: [], error: apiMessage(e, "คำนวณค่าจัดส่งไม่สำเร็จ") });
        setShippingMethodId("");
      });
    return () => {
      active = false;
    };
  }, [addressId]);

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId);
  const payKind = methodKey(selectedMethod);
  const shippingCost = shipping.options.find((o) => o.methodId === shippingMethodId)?.cost ?? null;

  // Integer-satang totals, rounded exactly like the backend.
  const totals = useMemo(() => {
    const subtotal = toSatang(cart.subtotal);
    const discount = Math.min(toSatang(coupon?.discount ?? 0), subtotal);
    const ship = shippingCost == null ? 0 : toSatang(shippingCost);
    const tax = Math.round(((subtotal - discount) * VAT_PERCENT) / 100);
    return {
      subtotal: fromSatang(subtotal),
      discount: fromSatang(discount),
      shipping: shippingCost == null ? null : fromSatang(ship),
      tax: fromSatang(tax),
      total: fromSatang(subtotal - discount + ship + tax),
    };
  }, [cart.subtotal, coupon, shippingCost]);

  const applyCoupon = (e) => {
    e.preventDefault();
    applyCode(couponInput.trim());
  };

  const applyCode = async (code) => {
    if (!code) {
      setCouponState({ loading: false, error: "กรุณากรอกโค้ดส่วนลด" });
      return;
    }
    setCouponState({ loading: true, error: null });
    try {
      const res = await couponsAPI.validate(code, cart.subtotal);
      setCoupon({ code: res.coupon?.code ?? code.toUpperCase(), discount: Number(res.discount) || 0 });
      setCouponInput("");
      setCouponState({ loading: false, error: null });
    } catch (err) {
      setCoupon(null);
      setCouponState({ loading: false, error: couponErrorMessage(err) });
    }
  };

  /** Put the order's lines back in the cart after a failed/cancelled payment. */
  const restoreCart = useCallback(async () => {
    for (const item of cart.items) {
      try {
        await cartAPI.addItem({ productId: item.productId, variantId: item.variantId, quantity: item.quantity });
      } catch {
        // Out of stock now, etc. The rest are still restored.
      }
    }
    refreshCartBadge();
  }, [cart.items, refreshCartBadge]);

  const placeOrder = async () => {
    setFormError(null);
    if (!addressId) return setFormError("กรุณาเลือกที่อยู่จัดส่ง");
    if (!shippingMethodId) return setFormError("กรุณาเลือกวิธีจัดส่ง");
    if (!selectedMethod) return setFormError("กรุณาเลือกวิธีชำระเงิน");

    let omiseToken;
    if (payKind === "card") {
      const errors = validateCard(card);
      setCardErrors(errors);
      if (Object.keys(errors).length) {
        document.getElementById(`card-${Object.keys(errors)[0]}`)?.focus();
        return;
      }
    }

    setSubmitting(true);
    try {
      if (payKind === "card") {
        try {
          omiseToken = await createCardToken(card);
        } catch (e) {
          setFormError(cardErrorMessage(e.message));
          return;
        }
      }
      if (!attemptKey.current) newAttemptKey();
      const res = await orderAPI.createOrder({
        shippingAddressId: addressId,
        billingAddressId: addressId,
        shippingMethodId,
        paymentMethodId,
        items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity })),
        ...(coupon ? { couponCode: coupon.code } : {}),
        ...(omiseToken ? { omiseToken } : {}),
      }, { idempotencyKey: attemptKey.current });
      const order = res?.data ?? res;
      refreshCartBadge();
      attemptKey.current = null; // the next checkout is a new attempt

      if (order?.paymentUncertain) {
        // The bank/provider did not answer in time: the order is kept and
        // confirmed automatically. Do not tell the customer it failed.
        toast("กำลังยืนยันผลการชำระเงินกับธนาคาร ไม่ต้องชำระซ้ำ", { duration: 6000 });
        router.push(`/orders/${order.id}`);
        return;
      }

      if (payKind === "promptpay") {
        const url = order?.charge?.qrCodeUrl || order?.charge?.source?.scannable_code?.image?.download_uri;
        if (url) {
          setQr({ orderId: order.id, url, total: order.total, deadline: order.paymentDeadline });
          return;
        }
        toast("สร้างคำสั่งซื้อแล้ว ชำระเงินได้ที่หน้าคำสั่งซื้อ");
      } else if (payKind === "card") {
        if (order?.paymentStatus === "completed") toast.success("ชำระเงินสำเร็จ ขอบคุณที่สั่งซื้อ");
        else toast("กำลังรอยืนยันการชำระเงิน");
      }
      router.push(`/orders/${order.id}`);
    } catch (e) {
      // The server answered: this attempt is over, a retry is a new attempt.
      // No answer (network drop): keep the key so a retry cannot double-order.
      if (e?.response) attemptKey.current = null;
      const code = e?.response?.data?.code;
      // The server cancels an order whose payment fails; give the items back.
      if (code === "PAYMENT_FAILED" || code === "PAYMENT_DECLINED") await restoreCart();
      setFormError(apiMessage(e, "สั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง"));
    } finally {
      setSubmitting(false);
    }
  };

  // While the QR is open, watch for the payment (webhook updates the order).
  useEffect(() => {
    if (!qr?.orderId) return;
    const timer = setInterval(async () => {
      try {
        const res = await orderAPI.getOrder(qr.orderId);
        const order = res?.data ?? res;
        if (order?.paymentStatus === "completed") {
          clearInterval(timer);
          toast.success("ได้รับชำระเงินแล้ว ขอบคุณที่สั่งซื้อ");
          router.push(`/orders/${qr.orderId}`);
        }
      } catch {
        // keep polling
      }
    }, QR_POLL_MS);
    return () => clearInterval(timer);
  }, [qr?.orderId, router]);

  const cancelQrOrder = async () => {
    if (!window.confirm("ยกเลิกคำสั่งซื้อนี้? สินค้าจะถูกใส่กลับในตะกร้า")) return;
    setCancelling(true);
    try {
      await orderAPI.cancelOrder(qr.orderId, "Cancelled at checkout");
      await restoreCart();
      toast("ยกเลิกคำสั่งซื้อแล้ว");
      setQr(null);
      router.push("/cart");
    } catch (e) {
      toast.error(apiMessage(e, "ยกเลิกไม่สำเร็จ"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-10" aria-busy="true">
        <div className="h-9 w-56 animate-pulse rounded bg-surface-muted" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-card bg-surface-muted" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-card bg-surface-muted" />
        </div>
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">โหลดหน้าชำระเงินไม่สำเร็จ</h1>
        <p className="mt-2 text-sm text-fg-muted">{loadError}</p>
        <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
          ลองอีกครั้ง
        </Button>
      </Container>
    );
  }

  if (cart.items.length === 0 && !qr) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">ไม่มีสินค้าในตะกร้า</h1>
        <p className="mt-2 text-sm text-fg-muted">เพิ่มสินค้าลงตะกร้าก่อนชำระเงิน</p>
        <Link href="/products" className={buttonClasses({ variant: "brand", className: "mt-6" })}>
          เลือกซื้อสินค้า
        </Link>
      </Container>
    );
  }

  const ctaLabel = payKind === "promptpay" ? "สร้าง QR ชำระเงิน" : `ชำระเงิน ${formatTHB(totals.total)}`;

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">ชำระเงิน</h1>
        <Link href="/cart" className="text-sm font-semibold underline underline-offset-4">
          กลับไปแก้ไขตะกร้า
        </Link>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <Step
            n={1}
            title="ที่อยู่จัดส่ง"
            Icon={MapPin}
            action={
              <Link href="/profile" className="text-sm font-semibold underline underline-offset-4">
                จัดการที่อยู่
              </Link>
            }
          >
            {addresses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-5 text-sm">
                <p className="font-medium">ยังไม่มีที่อยู่จัดส่ง</p>
                <p className="mt-1 text-fg-muted">เพิ่มที่อยู่ในหน้าบัญชี แล้วกลับมาที่หน้านี้</p>
                <Link href="/profile" className={buttonClasses({ variant: "outline", size: "sm", className: "mt-4" })}>
                  เพิ่มที่อยู่
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="step-1">
                {addresses.map((a) => (
                  <ChoiceCard key={a.id} name="address" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)}>
                    <span className="flex items-center gap-2 font-semibold">
                      {a.fullName || "ผู้รับ"}
                      {a.isDefault && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium">ค่าเริ่มต้น</span>}
                    </span>
                    <span className="mt-1 block leading-relaxed text-fg-muted">
                      {[a.addressLine1, a.addressLine2, a.subdistrict, a.district, a.province, a.postalCode].filter(Boolean).join(" ")}
                    </span>
                    {a.phoneNumber && <span className="mt-1 block text-fg-muted">โทร {a.phoneNumber}</span>}
                  </ChoiceCard>
                ))}
              </div>
            )}
          </Step>

          <Step n={2} title="วิธีจัดส่ง" Icon={Truck}>
            {!addressId ? (
              <p className="text-sm text-fg-muted">เลือกที่อยู่ก่อน เพื่อดูวิธีจัดส่งและค่าส่ง</p>
            ) : shipping.loading ? (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> กำลังคำนวณค่าจัดส่ง…
              </p>
            ) : shipping.error ? (
              <p className="text-sm font-medium text-danger">{shipping.error}</p>
            ) : (
              <div className="grid gap-3" role="radiogroup" aria-labelledby="step-2">
                {shipping.options.map((o) => (
                  <ChoiceCard
                    key={o.methodId}
                    name="shipping"
                    value={o.methodId}
                    checked={shippingMethodId === o.methodId}
                    onChange={() => setShippingMethodId(o.methodId)}
                  >
                    <span className="flex justify-between gap-3">
                      <span className="font-medium">{o.methodName}</span>
                      <span className="font-semibold tabular-nums">{o.cost > 0 ? formatTHB(o.cost) : "ฟรี"}</span>
                    </span>
                  </ChoiceCard>
                ))}
              </div>
            )}
          </Step>

          <Step n={3} title="วิธีชำระเงิน" Icon={Lock}>
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-fg-muted">ยังไม่มีวิธีชำระเงินที่เปิดใช้งาน</p>
            ) : (
              <div className="grid gap-3" role="radiogroup" aria-labelledby="step-3">
                {paymentMethods.map((m) => {
                  const ui = METHOD_UI[methodKey(m)] ?? { Icon: CreditCard, hint: m.description };
                  const on = paymentMethodId === m.id;
                  return (
                    <div key={m.id}>
                      <ChoiceCard name="payment" value={m.id} checked={on} onChange={() => setPaymentMethodId(m.id)}>
                        <span className="flex items-center gap-3">
                          <ui.Icon className="h-5 w-5 shrink-0" aria-hidden />
                          <span>
                            <span className="block font-medium">{m.name}</span>
                            {ui.hint && <span className="block text-xs text-fg-muted">{ui.hint}</span>}
                          </span>
                        </span>
                      </ChoiceCard>
                      {on && methodKey(m) === "card" && (
                        <div className="mt-3 grid gap-4 rounded-lg bg-surface-muted p-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <Field id="card-number" label="หมายเลขบัตร" error={cardErrors.number}>
                              <input
                                id="card-number"
                                inputMode="numeric"
                                autoComplete="cc-number"
                                placeholder="0000 0000 0000 0000"
                                value={card.number}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, "").slice(0, 19);
                                  setCard((c) => ({ ...c, number: raw.replace(/(.{4})/g, "$1 ").trim() }));
                                }}
                                aria-invalid={!!cardErrors.number}
                                aria-describedby={cardErrors.number ? "card-number-error" : undefined}
                                className={inputClass(cardErrors.number)}
                              />
                            </Field>
                          </div>
                          <div className="sm:col-span-2">
                            <Field id="card-name" label="ชื่อบนบัตร" error={cardErrors.name}>
                              <input
                                id="card-name"
                                autoComplete="cc-name"
                                placeholder="ชื่อ-นามสกุล (ภาษาอังกฤษ)"
                                value={card.name}
                                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                                aria-invalid={!!cardErrors.name}
                                aria-describedby={cardErrors.name ? "card-name-error" : undefined}
                                className={inputClass(cardErrors.name)}
                              />
                            </Field>
                          </div>
                          <Field id="card-expiry" label="วันหมดอายุ" error={cardErrors.expiry}>
                            <input
                              id="card-expiry"
                              inputMode="numeric"
                              autoComplete="cc-exp"
                              placeholder="ดด/ปป"
                              value={card.expiry}
                              onChange={(e) => {
                                let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                                setCard((c) => ({ ...c, expiry: v }));
                              }}
                              aria-invalid={!!cardErrors.expiry}
                              aria-describedby={cardErrors.expiry ? "card-expiry-error" : undefined}
                              className={inputClass(cardErrors.expiry)}
                            />
                          </Field>
                          <Field id="card-cvc" label="CVC" error={cardErrors.cvc}>
                            <input
                              id="card-cvc"
                              inputMode="numeric"
                              autoComplete="cc-csc"
                              placeholder="123"
                              value={card.cvc}
                              onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                              aria-invalid={!!cardErrors.cvc}
                              aria-describedby={cardErrors.cvc ? "card-cvc-error" : undefined}
                              className={inputClass(cardErrors.cvc)}
                            />
                          </Field>
                          <p className="flex items-center gap-1.5 text-xs text-fg-muted sm:col-span-2">
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                            ข้อมูลบัตรถูกเข้ารหัสโดย Omise และไม่ถูกส่งไปยังเซิร์ฟเวอร์ของร้าน
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Step>
        </div>

        <aside aria-labelledby="summary-title" className="rounded-card border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 id="summary-title" className="text-lg font-semibold">
            สรุปคำสั่งซื้อ
          </h2>
          <ul className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  <ProductImage imageUrl={item.product?.imageUrl?.[0]} alt="" fill className="object-cover" sizes="64px" />
                  <span className="absolute -right-0 -top-0 rounded-bl-lg bg-fg px-1.5 text-[11px] font-semibold text-canvas">
                    ×{item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="line-clamp-2 font-medium">{item.product?.name}</p>
                  {item.variant && <p className="text-xs text-fg-muted">{variantLabel(item.variant)}</p>}
                </div>
                <p className="text-sm font-medium tabular-nums">{formatTHB(Number(item.price) * item.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-border pt-5">
            {coupon ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-brand/20 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4" aria-hidden />
                  {coupon.code}
                  <span className="font-normal text-fg-muted">−{formatTHB(coupon.discount)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCoupon(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-fg/10"
                  aria-label={`ยกเลิกโค้ด ${coupon.code}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <form onSubmit={applyCoupon} noValidate>
                <label htmlFor="coupon" className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4" aria-hidden /> โค้ดส่วนลด
                </label>
                <div className="flex gap-2">
                  <input
                    id="coupon"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      if (couponState.error) setCouponState({ loading: false, error: null });
                    }}
                    placeholder="กรอกโค้ด"
                    autoComplete="off"
                    aria-invalid={!!couponState.error}
                    aria-describedby={couponState.error ? "coupon-error" : undefined}
                    className={`${inputClass(couponState.error)} uppercase`}
                  />
                  <Button type="submit" variant="default" disabled={couponState.loading} className="shrink-0">
                    {couponState.loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "ใช้โค้ด"}
                  </Button>
                </div>
                {couponState.error && (
                  <p id="coupon-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                    {couponState.error}
                  </p>
                )}
              </form>
            )}
            {available.coupons.length > 0 && (
              <details className="group mt-3" open={!coupon}>
                <summary className="cursor-pointer list-none text-xs font-semibold text-fg-muted hover:text-fg">
                  คูปองที่ใช้ได้ ({available.coupons.length})
                  <span className="ml-1 inline-block transition-transform group-open:rotate-180" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div className="mt-2">
                  <CouponList
                    compact
                    coupons={available.coupons}
                    subtotal={cart.subtotal}
                    appliedCode={coupon?.code}
                    onApply={applyCode}
                  />
                </div>
              </details>
            )}
          </div>

          <dl className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">ราคาสินค้า</dt>
              <dd className="tabular-nums">{formatTHB(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-fg-muted">ส่วนลด ({coupon?.code})</dt>
                <dd className="font-medium tabular-nums text-success">−{formatTHB(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-fg-muted">ค่าจัดส่ง</dt>
              <dd className="tabular-nums">{totals.shipping == null ? "–" : totals.shipping > 0 ? formatTHB(totals.shipping) : "ฟรี"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">VAT {VAT_PERCENT}%</dt>
              <dd className="tabular-nums">{formatTHB(totals.tax)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">ยอดชำระทั้งหมด</span>
            <span className="text-2xl font-semibold tabular-nums">{formatTHB(totals.total)}</span>
          </div>

          {formError && (
            <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger">
              {formError}
            </p>
          )}
          <Button
            variant="brand"
            size="lg"
            className="mt-5 w-full"
            onClick={placeOrder}
            disabled={submitting || !addressId || !shippingMethodId || !selectedMethod}
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {submitting ? "กำลังดำเนินการ…" : ctaLabel}
          </Button>
          <p className="mt-3 text-center text-xs text-fg-subtle">ยอดสุดท้ายคำนวณโดยระบบอีกครั้งเมื่อยืนยันคำสั่งซื้อ</p>
        </aside>
      </div>

      <Dialog open={!!qr} onClose={() => qr && router.push(`/orders/${qr.orderId}`)} className="relative z-[130]">
        <div className="fixed inset-0 bg-black/50" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-xl">
            <DialogTitle className="text-lg font-semibold">สแกนเพื่อชำระด้วย PromptPay</DialogTitle>
            {qr && (
              <>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatTHB(qr.total)}</p>
                {qr.deadline && (
                  <p className="mt-1 text-xs text-fg-muted">
                    ชำระภายใน {new Date(qr.deadline).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                    หลังจากนั้นคำสั่งซื้อจะถูกยกเลิกอัตโนมัติ
                  </p>
                )}
                <div className="relative mx-auto mt-4 aspect-square w-60 overflow-hidden rounded-lg border border-border bg-white">
                  <Image src={qr.url} alt="QR code PromptPay สำหรับคำสั่งซื้อนี้" fill unoptimized className="object-contain" />
                </div>
                <p className="mt-4 flex items-center justify-center gap-2 text-sm text-fg-muted" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> รอการชำระเงิน…
                </p>
                <p className="mt-2 text-xs text-fg-subtle">ปิดหน้านี้ได้ คำสั่งซื้อจะรอชำระ และชำระต่อได้ที่หน้าคำสั่งซื้อ</p>
                <div className="mt-6 grid gap-2">
                  <Link href={`/orders/${qr.orderId}`} className={buttonClasses({ variant: "default" })}>
                    ไปที่คำสั่งซื้อ
                  </Link>
                  <Button variant="ghost" onClick={cancelQrOrder} disabled={cancelling} className="text-danger">
                    {cancelling ? "กำลังยกเลิก…" : "ยกเลิกคำสั่งซื้อ"}
                  </Button>
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </Container>
  );
}
