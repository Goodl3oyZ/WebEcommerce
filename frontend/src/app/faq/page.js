import Link from "next/link";
import Container from "@/components/shop/Container";
import OpenChatButton from "@/components/content/OpenChatButton";

export const metadata = {
  title: "คำถามที่พบบ่อย",
  description: "การชำระเงิน การจัดส่ง การยกเลิก การคืนเงิน แต้มสะสม และบัญชีผู้ใช้",
};

const link = "font-medium text-fg underline underline-offset-4";

// Answers follow what the shop actually does (checkout, payment worker,
// order rules, loyalty service). Update them when those rules change.
const GROUPS = [
  {
    title: "การสั่งซื้อและชำระเงิน",
    items: [
      {
        q: "ชำระเงินได้ช่องทางไหนบ้าง",
        a: <>บัตรเครดิต/เดบิต (Visa, Mastercard, JCB) และ PromptPay ผ่าน Omise ยังไม่รับเก็บเงินปลายทาง</>,
      },
      {
        q: "ข้อมูลบัตรของฉันปลอดภัยไหม",
        a: <>เลขบัตรถูกเข้ารหัสในเบราว์เซอร์และส่งตรงไปที่ Omise เซิร์ฟเวอร์ของร้านไม่เห็นและไม่เก็บเลขบัตร บางธนาคารอาจให้ยืนยันด้วย OTP (3-D Secure)</>,
      },
      {
        q: "ต้องชำระเงินภายในเวลาเท่าไร",
        a: <>ภายใน 30 นาทีหลังสั่งซื้อ ระหว่างนี้ร้านจองสินค้าไว้ให้ ถ้าไม่ชำระภายในเวลา คำสั่งซื้อจะถูกยกเลิกและสินค้ากลับเข้าสต็อก</>,
      },
      {
        q: "ราคาสินค้ารวม VAT หรือยัง",
        a: <>ราคาที่แสดงยังไม่รวม VAT 7% ระบบคำนวณ VAT ค่าส่ง และส่วนลดให้เห็นยอดสุทธิก่อนกดยืนยันคำสั่งซื้อ</>,
      },
      {
        q: "จ่ายด้วย PromptPay แล้ว สถานะยังไม่เปลี่ยน",
        a: <>ปกติอัปเดตภายในไม่กี่วินาทีหลังสแกนจ่าย ถ้าเกิน 5 นาทีให้รีเฟรชหน้าคำสั่งซื้อ หรือทักแชทกับทีมงานพร้อมเลขคำสั่งซื้อ</>,
      },
    ],
  },
  {
    title: "การจัดส่ง",
    items: [
      { q: "ส่งที่ไหนได้บ้าง", a: <>ทั่วประเทศไทย 77 จังหวัด ค่าส่งคำนวณตามจังหวัดปลายทางและวิธีจัดส่งที่เลือกในหน้าชำระเงิน</> },
      {
        q: "ติดตามพัสดุได้ที่ไหน",
        a: (
          <>
            ที่หน้า <Link href="/orders" className={link}>คำสั่งซื้อของฉัน</Link> เมื่อร้านจัดส่งแล้วจะเห็นเลขพัสดุ และได้รับการแจ้งเตือนทางเว็บและอีเมล
          </>
        ),
      },
      { q: "ได้รับสินค้าแล้วต้องทำอะไรไหม", a: <>ไม่ต้องทำอะไร ทีมงานจะอัปเดตสถานะเป็น &quot;จัดส่งสำเร็จ&quot; เมื่อขนส่งยืนยันการส่ง ถ้าสินค้ามีปัญหา ทักแชทกับทีมงานได้เลย</> },
    ],
  },
  {
    title: "ยกเลิก คืนสินค้า และคืนเงิน",
    items: [
      { q: "ยกเลิกคำสั่งซื้อได้ไหม", a: <>ยกเลิกเองได้ในหน้าคำสั่งซื้อ ถ้ายังไม่ได้ชำระเงิน ถ้าชำระแล้ว ให้ทักแชทกับทีมงานก่อนสินค้าถูกจัดส่ง</> },
      {
        q: "ขอคืนเงินยังไง",
        a: <>หลังได้รับสินค้า ทักแชทกับทีมงานพร้อมเลขคำสั่งซื้อและเหตุผล ทีมงานจะตรวจสอบและแจ้งผลทางเว็บและอีเมล</>,
      },
      { q: "เงินคืนเข้าช่องทางไหน ใช้เวลานานเท่าไร", a: <>คืนเข้าช่องทางเดิมที่ชำระ บัตรเครดิตมักใช้เวลาไม่กี่วันทำการตามรอบของธนาคาร</> },
    ],
  },
  {
    title: "แต้มสะสมและคูปอง",
    items: [
      {
        q: "ได้แต้มยังไง",
        a: <>ทุก ฿10 จากคำสั่งซื้อที่ชำระเงินแล้วได้ 1 แต้ม สมาชิกระดับ Silver (500 แต้มขึ้นไป) ได้แต้มเพิ่ม 1.25 เท่า และ Gold (2,000 แต้มขึ้นไป) 1.5 เท่า</>,
      },
      {
        q: "ดูแต้มของฉันได้ที่ไหน",
        a: (
          <>
            ที่หน้า <Link href="/profile" className={link}>บัญชีของฉัน</Link> ระบบแลกแต้มเป็นคูปองส่วนลดกำลังจะเปิดให้ใช้ แต้มที่สะสมไว้ยังอยู่ครบ
          </>
        ),
      },
    ],
  },
  {
    title: "บัญชีผู้ใช้",
    items: [
      { q: "ทำไมต้องยืนยันอีเมล", a: <>เพื่อให้แน่ใจว่าอีเมลเป็นของคุณจริง ใช้รับการแจ้งเตือนคำสั่งซื้อและตั้งรหัสผ่านใหม่ ถ้าไม่ได้รับอีเมล กด &quot;ส่งลิงก์ยืนยันอีกครั้ง&quot; ที่หน้าเข้าสู่ระบบ หรือเข้าสู่ระบบด้วย Google/GitHub แทน</> },
      {
        q: "ลืมรหัสผ่าน",
        a: (
          <>
            ไปที่ <Link href="/auth/forgot-password" className={link}>ลืมรหัสผ่าน</Link> แล้วกรอกอีเมล ลิงก์ตั้งรหัสใหม่ใช้ได้ 30 นาที
          </>
        ),
      },
      {
        q: "ลบบัญชีได้ไหม",
        a: (
          <>
            ได้ ดูขั้นตอนที่ <Link href="/data-deletion" className={link}>การลบข้อมูลผู้ใช้</Link>
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">คำถามที่พบบ่อย</h1>
        <p className="mt-3 text-fg-muted">ไม่เจอคำตอบที่ต้องการ? ทักแชทกับทีมงานได้เลย</p>

        <div className="mt-10 space-y-10">
          {GROUPS.map((g) => (
            <section key={g.title} aria-labelledby={`faq-${g.title}`}>
              <h2 id={`faq-${g.title}`} className="text-lg font-semibold text-fg">
                {g.title}
              </h2>
              <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
                {g.items.map((item) => (
                  <details key={item.q} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-fg [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span className="text-xl leading-none text-fg-subtle transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-surface-muted p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-fg">ยังมีคำถาม?</p>
            <p className="mt-1 text-sm text-fg-muted">ทีมงานตอบในแชท พร้อมดูคำสั่งซื้อของคุณได้</p>
          </div>
          <OpenChatButton />
        </div>
      </div>
    </Container>
  );
}
