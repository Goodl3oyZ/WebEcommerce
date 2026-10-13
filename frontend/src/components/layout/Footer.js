"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiFacebook, FiGithub, FiInstagram } from "react-icons/fi";
import Container from "@/components/shop/Container";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useMaintenanceBlocked } from "@/components/layout/MaintenanceGate";

const columns = [
  {
    title: "เลือกซื้อ",
    links: [
      { href: "/products", label: "สินค้าทั้งหมด" },
      { href: "/products?sort=newest", label: "สินค้ามาใหม่" },
      { href: "/cart", label: "ตะกร้าสินค้า" },
    ],
  },
  {
    title: "ช่วยเหลือ",
    links: [
      { href: "/shipping", label: "การจัดส่ง" },
      { href: "/faq", label: "คำถามที่พบบ่อย" },
      { href: "/contact", label: "ติดต่อเรา" },
      { href: "/orders", label: "ติดตามคำสั่งซื้อ" },
    ],
  },
  {
    title: "เกี่ยวกับเรา",
    links: [
      { href: "/about", label: "เรื่องราวของเรา" },
      { href: "/blog", label: "บทความ" },
      { href: "/careers", label: "ร่วมงานกับเรา" },
    ],
  },
];

const socials = [
  { href: "https://www.facebook.com/panudet.fluke/", label: "Facebook", Icon: FiFacebook },
  { href: "https://www.instagram.com/fluke_psd/", label: "Instagram", Icon: FiInstagram },
  { href: "https://github.com/Goodl3oyZ", label: "GitHub", Icon: FiGithub },
];

export default function Footer() {
  const pathname = usePathname();
  const { siteName } = useSiteSettings();
  const maintenanceBlocked = useMaintenanceBlocked();
  const onHome = pathname === "/" && !maintenanceBlocked;
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className={`${onHome ? "border-t border-white/10" : "mt-20"} bg-[#0f0f0f] text-white`}>
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="font-display text-2xl font-bold italic uppercase tracking-tight">{siteName}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/65">
              อุปกรณ์วิ่ง ฟิตเนส และเทรนนิ่ง สำหรับคนที่ไม่หยุดพัฒนาตัวเอง
            </p>
            <ul className="mt-6 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-brand hover:text-brand focus-visible:outline-white"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold text-white/55">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/80 transition-colors hover:text-white hover:underline underline-offset-4 focus-visible:outline-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteName}. สงวนลิขสิทธิ์
            <span aria-hidden> · </span>
            <Link href="/privacy" className="hover:text-white hover:underline underline-offset-4">
              นโยบายความเป็นส่วนตัว
            </Link>
            <span aria-hidden> · </span>
            <Link href="/data-deletion" className="hover:text-white hover:underline underline-offset-4">
              การลบข้อมูล
            </Link>
          </p>
          <p>ราคาสินค้ายังไม่รวม VAT 7% ซึ่งคำนวณในขั้นตอนชำระเงิน</p>
        </div>
      </Container>
    </footer>
  );
}
