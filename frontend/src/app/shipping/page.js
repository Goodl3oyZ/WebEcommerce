import Link from "next/link";
import { CreditCard, PackageCheck, PackageSearch, Truck } from "lucide-react";
import Container from "@/components/shop/Container";
import OpenChatButton from "@/components/content/OpenChatButton";
import { serverGet } from "@/lib/serverApi";
import { formatTHB } from "@/lib/format";
import { AUTO_DELIVER_DAYS } from "@/lib/shipping";

export const metadata = {
  title: "การจัดส่ง",
  description: "ค่าจัดส่งแต่ละภูมิภาค ขั้นตอนตั้งแต่ชำระเงินจนได้รับสินค้า และการติดตามพัสดุ",
};

// What happens after checkout (see the order page and the payment worker).
const STEPS = [
  { Icon: CreditCard, title: "ชำระเงิน", text: "บัตรหรือ PromptPay ภายใน 30 นาทีหลังสั่งซื้อ สถานะเปลี่ยนเป็น “ชำระแล้ว” ทันทีที่เงินเข้า" },
  { Icon: PackageSearch, title: "เตรียมสินค้า", text: "ร้านแพ็กสินค้าและแจ้งสถานะ “กำลังเตรียมสินค้า” ให้คุณเห็นในหน้าคำสั่งซื้อ" },
  { Icon: Truck, title: "จัดส่ง", text: "เมื่อส่งของ คุณได้รับแจ้งเตือนและอีเมลพร้อมชื่อขนส่ง เลขพัสดุ และลิงก์ติดตาม" },
  {
    Icon: PackageCheck,
    title: "ได้รับสินค้า",
    text: `กด “ได้รับสินค้าแล้ว” ในหน้าคำสั่งซื้อ ถ้าไม่ได้กด ระบบจะยืนยันให้อัตโนมัติ ${AUTO_DELIVER_DAYS} วันหลังจัดส่ง`,
  },
];

export default async function ShippingPage() {
  const [zones, methods] = await Promise.all([serverGet("/shipping/zones"), serverGet("/shipping/methods")]);
  const zoneList = Array.isArray(zones) ? zones : zones?.zones ?? zones?.data ?? [];
  const methodList = Array.isArray(methods) ? methods : methods?.methods ?? methods?.data ?? [];
  const rates = zoneList
    .map((zone) => ({
      ...zone,
      methods: methodList
        .filter((m) => m.shippingZoneId === zone.id)
        .sort((a, b) => Number(a.price) - Number(b.price)),
    }))
    .filter((zone) => zone.methods.length > 0)
    .sort((a, b) => Number(a.methods[0].price) - Number(b.methods[0].price));

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">การจัดส่ง</h1>
        <p className="mt-3 max-w-2xl text-fg-muted">
          ส่งทั่วประเทศไทย ค่าส่งคิดตามภูมิภาคของที่อยู่จัดส่ง และแสดงยอดจริงในหน้าชำระเงินก่อนคุณกดยืนยัน
        </p>

        <section aria-labelledby="steps-title" className="mt-12">
          <h2 id="steps-title" className="text-xl font-semibold">หลังสั่งซื้อเกิดอะไรขึ้นบ้าง</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/20 text-sm font-bold" aria-hidden>
                    {i + 1}
                  </span>
                  <Icon className="h-5 w-5 text-fg-muted" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-fg">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="rates-title" className="mt-14">
          <h2 id="rates-title" className="text-xl font-semibold">ค่าจัดส่ง</h2>
          <p className="mt-1.5 text-sm text-fg-muted">ราคาต่อคำสั่งซื้อ ยังไม่รวม VAT 7% ซึ่งคำนวณรวมในหน้าชำระเงิน</p>
          {rates.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
              ดูค่าส่งได้ในหน้าชำระเงินหลังเลือกที่อยู่
            </p>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">ภูมิภาค</th>
                    <th scope="col" className="px-5 py-3 font-semibold">วิธีจัดส่ง</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">ค่าส่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rates.flatMap((zone) =>
                    zone.methods.map((m, i) => (
                      <tr key={m.id}>
                        {i === 0 && (
                          <th scope="row" rowSpan={zone.methods.length} className="px-5 py-4 align-top font-semibold text-fg">
                            {zone.description || zone.name}
                            {zone.provinces?.length > 0 && (
                              <span className="block text-xs font-normal text-fg-subtle">{zone.provinces.length} จังหวัด</span>
                            )}
                          </th>
                        )}
                        <td className="px-5 py-4 text-fg">
                          {m.name}
                          {m.description && <span className="block text-xs text-fg-subtle">{m.description}</span>}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold tabular-nums text-fg">{formatTHB(m.price)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="notes-title" className="mt-14 grid gap-4 sm:grid-cols-2">
          <h2 id="notes-title" className="sr-only">ข้อควรรู้</h2>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-semibold text-fg">ติดตามพัสดุ</h3>
            <p className="mt-1.5 text-sm text-fg-muted">
              เลขพัสดุและลิงก์ติดตามอยู่ที่หน้า{" "}
              <Link href="/orders" className="font-medium text-fg underline underline-offset-4">คำสั่งซื้อของฉัน</Link>{" "}
              และในอีเมลแจ้งการจัดส่ง
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-semibold text-fg">สินค้าเสียหายหรือไม่ครบ</h3>
            <p className="mt-1.5 text-sm text-fg-muted">
              ทักแชทกับทีมงานพร้อมเลขคำสั่งซื้อและรูปถ่าย ทีมงานจะช่วยเรื่องเปลี่ยนสินค้าหรือคืนเงิน ดูเพิ่มที่{" "}
              <Link href="/faq" className="font-medium text-fg underline underline-offset-4">คำถามที่พบบ่อย</Link>
            </p>
          </div>
        </section>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-surface-muted p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-muted">มีคำถามเรื่องการจัดส่ง? ทีมงานตอบในแชท</p>
          <OpenChatButton />
        </div>
      </div>
    </Container>
  );
}
