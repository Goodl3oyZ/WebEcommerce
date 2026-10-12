"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  ChevronDown,
  ClipboardList,
  LogOut,
  Menu,
  Search,
  Shield,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import useCartStore from "@/store/cartStore";
import { categoriesAPI } from "@/lib/api/categories";
import Container from "@/components/shop/Container";

const isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";

function Wordmark() {
  const { siteName } = useSiteSettings();
  return (
    <span className="max-w-[10rem] truncate font-display text-xl font-bold italic uppercase tracking-tight text-fg sm:max-w-none sm:text-2xl">
      {siteName}
    </span>
  );
}

function SearchForm({ autoFocus = false, onDone, className = "" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/products?search=${encodeURIComponent(term)}` : "/products");
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className={className}>
      <label htmlFor={autoFocus ? "site-search-mobile" : "site-search"} className="sr-only">
        ค้นหาสินค้า
      </label>
      <div className="flex h-10 items-center gap-2 rounded-full bg-surface-muted px-4 focus-within:ring-2 focus-within:ring-fg">
        <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
        <input
          id={autoFocus ? "site-search-mobile" : "site-search"}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหารองเท้า เสื้อ อุปกรณ์..."
          autoFocus={autoFocus}
          className="w-full border-0 bg-transparent p-0 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-0"
        />
      </div>
    </form>
  );
}

function AccountMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fg transition-colors hover:bg-fg/5";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-full pl-1 pr-2 transition-colors hover:bg-fg/5"
      >
        <span className="relative h-8 w-8 overflow-hidden rounded-full bg-surface-muted">
          {user.avatar ? (
            <Image src={user.avatar} alt="" fill sizes="32px" className="object-cover" />
          ) : (
            <User className="absolute inset-0 m-auto h-4 w-4 text-fg-muted" aria-hidden />
          )}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-medium lg:inline">
          {user.name || user.email?.split("@")[0]}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-fg-subtle lg:block" aria-hidden />
        <span className="sr-only">เมนูบัญชี</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <Link href="/profile" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <User className="h-4 w-4" aria-hidden /> บัญชีของฉัน
          </Link>
          <Link href="/orders" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <ClipboardList className="h-4 w-4" aria-hidden /> คำสั่งซื้อของฉัน
          </Link>
          {isAdmin(user) && (
            <Link href="/admin" role="menuitem" className={item} onClick={() => setOpen(false)}>
              <Shield className="h-4 w-4" aria-hidden /> จัดการระบบ
            </Link>
          )}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger`}
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden /> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + (i.quantity || 0), 0));
  const fetchCart = useCartStore((s) => s.fetchCartFromBackend);

  useEffect(() => setMounted(true), []);

  // The badge reflects the server cart for signed-in users.
  useEffect(() => {
    if (user) fetchCart();
  }, [user, fetchCart]);

  useEffect(() => {
    categoriesAPI
      .getAllCategories()
      .then((res) => {
        const list = res?.categories ?? res?.data ?? res;
        setCategories(Array.isArray(list) ? list.filter((c) => !c.parentId).slice(0, 4) : []);
      })
      .catch(() => setCategories([]));
  }, []);

  // Close overlays on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  const navLink = (active) =>
    `relative px-1 py-2 text-sm font-medium transition-colors hover:text-fg ${
      active ? "text-fg after:absolute after:inset-x-1 after:-bottom-0.5 after:h-0.5 after:bg-brand" : "text-fg-muted"
    }`;
  const count = mounted ? cartCount : 0;

  return (
    <header className="sticky top-0 z-[100] border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <Container className="flex h-16 items-center gap-3 lg:gap-8">
        <button
          type="button"
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/5 md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2" aria-label="หน้าแรก">
          <Image src="/favicon.png" alt="" width={32} height={32} className="h-8 w-8" priority />
          <Wordmark />
        </Link>

        <nav aria-label="หมวดหมู่หลัก" className="hidden items-center gap-5 md:flex">
          <Link href="/products" className={navLink(pathname === "/products")}>
            สินค้าทั้งหมด
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.id}`} className={`${navLink(false)} hidden lg:inline`}>
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchForm className="hidden w-56 md:block lg:w-72" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/5 md:hidden"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="ค้นหา"
            aria-expanded={searchOpen}
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>

          {mounted && user ? (
            <div className="hidden md:block">
              <AccountMenu user={user} logout={logout} />
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="hidden h-10 items-center rounded-full px-3 text-sm font-medium text-fg hover:bg-fg/5 md:inline-flex"
            >
              เข้าสู่ระบบ
            </Link>
          )}

          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/5"
            aria-label={count > 0 ? `ตะกร้าสินค้า ${count} ชิ้น` : "ตะกร้าสินค้า"}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-ink ring-2 ring-surface">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </Container>

      {searchOpen && (
        <div className="border-t border-border bg-surface md:hidden">
          <Container className="py-3">
            <SearchForm autoFocus onDone={() => setSearchOpen(false)} />
          </Container>
        </div>
      )}

      <Dialog open={menuOpen} onClose={setMenuOpen} className="relative z-[120] md:hidden">
        <DialogBackdrop className="fixed inset-0 bg-black/40 transition-opacity duration-200 data-[closed]:opacity-0" transition />
        <DialogPanel
          transition
          className="fixed inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-surface shadow-xl transition-transform duration-200 ease-out data-[closed]:-translate-x-full"
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Wordmark />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/5"
              aria-label="ปิดเมนู"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <nav aria-label="เมนูมือถือ" className="flex-1 overflow-y-auto px-2 py-4">
            <p className="px-3 pb-2 text-sm font-semibold text-fg-subtle">เลือกซื้อ</p>
            {[{ id: "all", name: "สินค้าทั้งหมด", href: "/products" }, { id: "new", name: "สินค้ามาใหม่", href: "/products?sort=newest" }]
              .concat(categories.map((c) => ({ id: c.id, name: c.name, href: `/products?category=${c.id}` })))
              .map((l) => (
                <Link key={l.id} href={l.href} className="flex items-center rounded-lg px-3 py-3 text-base font-medium hover:bg-fg/5">
                  {l.name}
                </Link>
              ))}
            <div className="my-3 border-t border-border" />
            {mounted && user ? (
              <>
                <Link href="/profile" className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-fg/5">
                  <User className="h-5 w-5" aria-hidden /> บัญชีของฉัน
                </Link>
                <Link href="/orders" className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-fg/5">
                  <ClipboardList className="h-5 w-5" aria-hidden /> คำสั่งซื้อของฉัน
                </Link>
                {isAdmin(user) && (
                  <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-fg/5">
                    <Shield className="h-5 w-5" aria-hidden /> จัดการระบบ
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-danger hover:bg-danger/5"
                >
                  <LogOut className="h-5 w-5" aria-hidden /> ออกจากระบบ
                </button>
              </>
            ) : (
              <div className="grid gap-2 px-3">
                <Link href="/auth/login" className="flex h-11 items-center justify-center rounded-full bg-fg text-sm font-semibold text-canvas">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/auth/register" className="flex h-11 items-center justify-center rounded-full border border-fg/25 text-sm font-semibold">
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </nav>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
