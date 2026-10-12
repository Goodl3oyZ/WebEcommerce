"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import useCartStore from "@/store/cartStore";
import { Button } from "@/components/ui/Button"; // Consistent naming
import Image from "next/image";
import {
  FiShoppingCart,
  FiUser,
  FiPackage,
  FiMenu,
  FiX,
  FiLogOut,
  FiShoppingBag,
  FiHome, // Added for potential home link in mobile menu
  FiClipboard, // For orders
  FiSettings, // For profile/settings
  FiShield, // For Admin
} from "react-icons/fi"; // Grouped for readability
export default function Header() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  console.log("Header rendering user:", user?.email, "role:", user?.role);
  const cartItems = useCartStore((state) => state.totalItems);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false); // New state for profile dropdown

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when a link is clicked
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Toggle profile dropdown
  const toggleProfileDropdown = () =>
    setProfileDropdownOpen(!profileDropdownOpen);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownOpen &&
        event.target.closest(".profile-dropdown-container") === null
      ) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 w-full z-[100] transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-xl shadow-md border-b border-gray-100"
            : "bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-100/60"
        }`}
        style={{ WebkitBackdropFilter: "blur(14px)" }}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-3 shrink-0 group"
              onClick={closeMobileMenu}
              aria-label="Home page"
            >
              {/* <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow group-hover:scale-105 transition-transform"> */}
              <Image
                src="/favicon.png"
                alt="Challenge change your dream"
                width={40}
                height={40}
              />
              {/* </div> */}
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent tracking-tight group-hover:opacity-80 transition-opacity">
                C H A L L E N G E
              </span>
            </Link>

            {/* Desktop Navigation & User Actions */}
            <div className="hidden md:flex items-center space-x-7">
              <Link
                href="/products"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 flex items-center space-x-1 group transition duration-200"
              >
                <FiPackage className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                <span>สินค้า</span>
              </Link>
              <Link
                href="/cart"
                className="relative text-sm font-medium text-gray-700 hover:text-blue-600 flex items-center space-x-1 group transition duration-200"
              >
                <FiShoppingCart className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white animate-bounce-once">
                    {cartItems > 99 ? "99+" : cartItems}
                  </span>
                )}
                <span>ตะกร้า</span>
              </Link>
              {mounted && (user?.role === "admin" || user?.role === "super_admin") && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center space-x-1 group transition duration-200"
                >
                  <FiShield className="w-5 h-5 text-red-500 group-hover:text-red-600 animate-pulse" />
                  <span className="font-bold">จัดการระบบ (Admin)</span>
                </Link>
              )}
              {/* Conditional User Section */}
              {mounted && user ? (
                <div className="relative profile-dropdown-container">
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full pr-0.5 py-0.5 hover:bg-gray-100/60 transition"
                    aria-expanded={profileDropdownOpen}
                    aria-controls="profile-menu"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-blue-300 shadow-md">
                      <Image
                        src={user.avatar || "/default-avatar.png"}
                        alt="User avatar"
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <span className="text-base font-medium text-gray-700 truncate max-w-[120px] hidden lg:inline-block">
                      {user.name || user.email?.split("@")[0]}
                    </span>
                    <FiUser className="w-5 h-5 text-gray-400 lg:hidden" />
                  </button>
                  {profileDropdownOpen && (
                    <div
                      id="profile-menu"
                      className="absolute right-0 mt-3 w-56 bg-white/95 rounded-2xl shadow-2xl border border-gray-100 animate-fade-in-down origin-top-right overflow-hidden"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="profile-button"
                    >
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-5 py-3 text-base text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition rounded-t-2xl"
                        onClick={() => setProfileDropdownOpen(false)}
                        role="menuitem"
                      >
                        <FiSettings className="w-4 h-4 text-blue-500" />
                        <span>โปรไฟล์</span>
                      </Link>
                      {mounted && (user?.role === "admin" || user?.role === "super_admin") && (
                        <Link
                          href="/admin"
                          className="flex items-center space-x-3 px-5 py-3 text-base text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                          onClick={() => setProfileDropdownOpen(false)}
                          role="menuitem"
                        >
                          <FiShield className="w-4 h-4 text-blue-500" />
                          <span>จัดการระบบ (Admin)</span>
                        </Link>
                      )}
                      <Link
                        href="/orders"
                        className="flex items-center space-x-3 px-5 py-3 text-base text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                        onClick={() => setProfileDropdownOpen(false)}
                        role="menuitem"
                      >
                        <FiClipboard className="w-4 h-4 text-blue-500" />
                        <span>คำสั่งซื้อของฉัน</span>
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center space-x-3 px-5 py-3 text-base text-red-600 hover:bg-red-50 hover:text-red-700 transition rounded-b-2xl"
                        role="menuitem"
                      >
                        <FiLogOut className="w-4 h-4" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-3">
                  <Link href="/auth/login" onClick={closeMobileMenu}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-700 hover:bg-blue-50 hover:text-blue-700 px-5 font-semibold text-base"
                    >
                      เข้าสู่ระบบ
                    </Button>
                  </Link>
                  <Link href="/auth/register" onClick={closeMobileMenu}>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 transition shadow-lg px-5 font-semibold text-white text-base"
                    >
                      สมัครสมาชิก
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            {/* Mobile Menu Toggle & Cart Icon (Mobile Only) */}
            <div className="md:hidden flex items-center space-x-4">
              <Link
                href="/cart"
                className="relative p-1.5 rounded-md hover:bg-blue-50 transition"
                aria-label="View shopping cart"
                onClick={closeMobileMenu}
              >
                <FiShoppingCart className="w-6 h-6 text-blue-600" />
                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white animate-bounce-once">
                    {cartItems > 99 ? "99+" : cartItems}
                  </span>
                )}
              </Link>
              <button
                className="p-2 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <FiX className="w-6 h-6 text-blue-600" />
                ) : (
                  <FiMenu className="w-6 h-6 text-blue-600" />
                )}
              </button>
            </div>
          </div>
        </nav>
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={closeMobileMenu}
            aria-hidden="true"
          ></div>
        )}
        {/* Mobile Menu Content */}
        <div
          className={`md:hidden fixed top-0 right-0 w-72 h-full bg-white rounded-t-xl  shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-heading"
        >
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <h2
              id="mobile-menu-heading"
              className="text-lg font-bold text-blue-700"
            >
              เมนู
            </h2>
            <button
              className="p-2 rounded-md hover:bg-gray-200"
              onClick={closeMobileMenu}
              aria-label="Close menu"
            >
              <FiX className="w-6 h-6 text-blue-600" />
            </button>
          </div>
          <div className="py-4 space-y-2 px-4 bg-slate-50 rounded-b-xl ">
            <Link
              href="/"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-100 transition"
              onClick={closeMobileMenu}
            >
              <FiHome className="w-5 h-5 text-blue-500" />
              <span className="text-gray-800 text-base">หน้าหลัก</span>
            </Link>
            <Link
              href="/products"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-100 transition"
              onClick={closeMobileMenu}
            >
              <FiPackage className="w-5 h-5 text-blue-500" />
              <span className="text-gray-800 text-base">สินค้าทั้งหมด</span>
            </Link>
            <Link
              href="/cart"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-100 transition relative"
              onClick={closeMobileMenu}
            >
              <FiShoppingCart className="w-5 h-5 text-blue-500" />
              <span className="text-gray-800 text-base">ตะกร้าสินค้า</span>
              {cartItems > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItems > 99 ? "99+" : cartItems}
                </span>
              )}
            </Link>

            {mounted && user && (
              <>
                <Link
                  href="/profile"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-100 transition"
                  onClick={closeMobileMenu}
                >
                  <FiSettings className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-800 text-base">โปรไฟล์</span>
                </Link>
                {mounted && (user?.role === "admin" || user?.role === "super_admin") && (
                  <Link
                    href="/admin"
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-100 transition"
                    onClick={closeMobileMenu}
                  >
                    <FiShield className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-800 text-base font-semibold">จัดการระบบ (Admin)</span>
                  </Link>
                )}
                <Link
                  href="/orders"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-100 transition"
                  onClick={closeMobileMenu}
                >
                  <FiClipboard className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-800 text-base">
                    คำสั่งซื้อของฉัน
                  </span>
                </Link>
                <div className="border-t my-2"></div>
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="w-full text-left flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                >
                  <FiLogOut className="w-5 h-5" />
                  <span className="text-base">ออกจากระบบ</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="h-16"></div>
    </>
  );
}
