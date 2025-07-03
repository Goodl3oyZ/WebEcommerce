import Link from "next/link";
import React from "react";
import { FiFacebook, FiGithub, FiInstagram } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h3 className="text-2xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CHALLENGE
            </h3>
            <p className="text-gray-300 mb-6 max-w-xs">
              Empowering your transformation through quality products and
              inspiration.
            </p>
            <div className="flex space-x-4 mt-4">
              <a
                href="https://www.facebook.com/panudet.fluke/"
                aria-label="Facebook"
                className="hover:text-blue-400 transition-colors text-2xl"
              >
                <FiFacebook />
              </a>
              <a
                href="https://www.instagram.com/fluke_psd/"
                aria-label="Instagram"
                className="hover:text-pink-400 transition-colors text-2xl"
              >
                <FiInstagram />
              </a>
              <a
                href="https://github.com/Goodl3oyZ"
                aria-label="Github"
                className="hover:text-slate-900 transition-colors text-2xl"
              >
                <FiGithub />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Shop</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/products"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/products/new"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link
                  href="/products/sale"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Sale Items
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Help</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Shipping & Returns
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400 text-sm">
          <p>
            © {new Date().getFullYear()} CHALLENGE. All rights reserved. |
            Designed with <span className="text-pink-400">♥</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
// This is a simple footer component for a React application.
