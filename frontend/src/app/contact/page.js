import Link from "next/link";
import { Mail, MessageCircle, Package, HelpCircle } from "lucide-react";
import Container from "@/components/shop/Container";
import OpenChatButton from "@/components/content/OpenChatButton";
import { CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata = {
  title: "ติดต่อเรา",
  description: "แชทกับทีมงาน ติดตามคำสั่งซื้อ และช่องทางติดต่อร้าน",
};

const card = "flex flex-col rounded-2xl border border-border bg-surface p-6";

export default function ContactPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ติดต่อเรา</h1>
        <p className="mt-3 max-w-2xl text-fg-muted">
          ทางที่เร็วที่สุดคือแชทกับทีมงาน ถ้าเป็นเรื่องคำสั่งซื้อ แจ้งเลขคำสั่งซื้อมาด้วยจะช่วยให้ตอบได้ไวขึ้น
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <section className={`${card} sm:col-span-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6`}>
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/20" aria-hidden>
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-fg">แชทกับทีมงาน</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  เปิดได้ทุกหน้าจากปุ่ม &quot;ติดต่อทีมงาน&quot; มุมขวาล่าง ต้องเข้าสู่ระบบก่อน เพื่อให้ทีมงานเห็นคำสั่งซื้อของคุณ
                </p>
              </div>
            </div>
            <OpenChatButton className="mt-4 self-start sm:mt-0 sm:self-center" />
          </section>

          <section className={card}>
            <Package className="h-5 w-5 text-fg-muted" aria-hidden />
            <h2 className="mt-3 font-semibold text-fg">ติดตามคำสั่งซื้อ</h2>
            <p className="mt-1 flex-1 text-sm text-fg-muted">ดูสถานะ เลขพัสดุ ขอคืนเงิน หรือยกเลิกคำสั่งซื้อที่ยังไม่ชำระได้เอง</p>
            <Link href="/orders" className="mt-4 text-sm font-semibold text-fg underline underline-offset-4">
              คำสั่งซื้อของฉัน
            </Link>
          </section>

          <section className={card}>
            <HelpCircle className="h-5 w-5 text-fg-muted" aria-hidden />
            <h2 className="mt-3 font-semibold text-fg">คำถามที่พบบ่อย</h2>
            <p className="mt-1 flex-1 text-sm text-fg-muted">การชำระเงิน การจัดส่ง การคืนเงิน และแต้มสะสม</p>
            <Link href="/faq" className="mt-4 text-sm font-semibold text-fg underline underline-offset-4">
              ดูคำถามทั้งหมด
            </Link>
          </section>

          {CONTACT_EMAIL && (
            <section className={`${card} sm:col-span-2`}>
              <Mail className="h-5 w-5 text-fg-muted" aria-hidden />
              <h2 className="mt-3 font-semibold text-fg">อีเมล</h2>
              <p className="mt-1 text-sm text-fg-muted">สำหรับเรื่องที่ไม่เร่งด่วน หรือขอลบข้อมูลส่วนบุคคล</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 text-sm font-semibold text-fg underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            </section>
          )}
        </div>
      </div>
    </Container>
  );
}
