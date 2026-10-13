import Link from "next/link";
import LegalPage, { ContactLine, Section } from "@/components/legal/LegalPage";

export const metadata = {
  title: "การลบข้อมูลผู้ใช้",
  description: "วิธีขอลบบัญชีและข้อมูลส่วนบุคคล รวมถึงข้อมูลที่ได้จากการเข้าสู่ระบบด้วย Google หรือ GitHub",
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="การลบข้อมูลผู้ใช้"
      updated="14 ตุลาคม 2569"
      intro="คุณขอลบบัญชีและข้อมูลส่วนบุคคลได้ทุกเมื่อ รวมถึงข้อมูลที่ได้มาจากการเข้าสู่ระบบด้วย Google หรือ GitHub"
    >
      <Section title="ขอลบบัญชีและข้อมูล">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <ContactLine />
          </li>
          <li>
            แจ้งว่าต้องการลบบัญชี พร้อมอีเมลที่ใช้สมัครหรือที่ผูกกับ Google/GitHub
            ถ้าส่งจากบัญชีที่เข้าสู่ระบบอยู่ เราจะยืนยันตัวตนได้ทันที ถ้าไม่ เราจะส่งอีเมลไปยืนยันกับอีเมลของบัญชีก่อน
          </li>
          <li>เราจะลบข้อมูลภายใน 30 วัน และแจ้งให้คุณทราบเมื่อลบเสร็จ</li>
        </ol>
      </Section>

      <Section title="ข้อมูลที่จะถูกลบ">
        <ul>
          <li>ชื่อ อีเมล รหัสผ่าน เบอร์โทร และรูปโปรไฟล์</li>
          <li>ข้อมูลที่ได้จาก Google หรือ GitHub (ชื่อ อีเมล รูป และรหัสผู้ใช้ของบริการนั้น)</li>
          <li>ที่อยู่ ตะกร้า รายการที่ชอบ แต้มสะสม การแจ้งเตือน และประวัติแชท</li>
          <li>ข้อมูลการเข้าสู่ระบบและเซสชันทั้งหมด (ระบบจะออกจากระบบทุกอุปกรณ์)</li>
        </ul>
        <p>
          <strong>ข้อยกเว้น:</strong> เอกสารคำสั่งซื้อและการชำระเงินต้องเก็บไว้ตามที่กฎหมายบัญชีและภาษีกำหนด
          เราจะตัดชื่อ อีเมล และเบอร์โทรออก เหลือเพียงข้อมูลที่จำเป็นทางบัญชี
        </p>
      </Section>

      <Section title="ยกเลิกการเชื่อมต่อกับ Google หรือ GitHub">
        <p>
          ถ้าต้องการหยุดให้ร้านเข้าถึงบัญชีด้วย ให้ลบสิทธิ์ของร้านที่ Google (myaccount.google.com → ความปลอดภัย →
          การเชื่อมต่อกับแอปและบริการของบุคคลที่สาม) หรือ GitHub (Settings → Applications → Authorized OAuth Apps)
          ข้อมูลที่ร้านมีอยู่แล้ว ให้ขอลบตามขั้นตอนด้านบน
        </p>
      </Section>

      <p className="text-sm text-fg-subtle">
        อ่านรายละเอียดการใช้ข้อมูลทั้งหมดได้ที่{" "}
        <Link href="/privacy" className="font-medium text-fg underline underline-offset-4">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </LegalPage>
  );
}
