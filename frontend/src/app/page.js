"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  FiArrowRight,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiLock,
  FiZap,
  FiGift,
} from "react-icons/fi";
import { productsAPI } from "@/lib/api";
import { categoriesAPI } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [brands, setBrands] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [catRes, prodRes, brandRes] = await Promise.all([
          categoriesAPI.getAllCategories(),
          productsAPI.getAllProducts({ limit: 8 }),
          (
            await import("@/lib/api/brands")
          ).default.getAllBrands
            ? (await import("@/lib/api/brands")).default.getAllBrands()
            : { brands: [] },
        ]);
        setCategories(
          Array.isArray(catRes.categories) ? catRes.categories : catRes
        );
        setProducts(prodRes.products || []);
        setBrands(brandRes.brands || []);
        // Mock collections and promos for now
        setCollections([
          {
            id: 1,
            name: "Summer Collection",
            image: "/homePageImages/zhenyu-luo-eQs-L16uFSA-unsplash.jpg",
            description: "คอลเลกชันฤดูร้อนสุดพิเศษ!",
            link: "/collections/summer",
          },
        ]);
        setPromos([
          {
            id: 1,
            title: "Flash Sale!",
            desc: "ลดสูงสุด 50% เฉพาะวันนี้",
            image: "/homePageImages/summer-rune-afSe8cyNiBI-unsplash.jpg",
            link: "/flash-sale",
            badge: "Flash Sale",
          },
          {
            id: 2,
            title: "รับคูปองส่วนลด 200฿",
            desc: "เมื่อสมัครสมาชิกใหม่",
            image: "/homePageImages/nimble-made-hMMXhKSZk7k-unsplash.jpg",
            link: "/register",
            badge: "Coupon",
          },
        ]);
      } catch (e) {
        setCategories([]);
        setProducts([]);
        setBrands([]);
        setCollections([]);
        setPromos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white antialiased">
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 w-full h-full">
            <Image
              src="/homePageImages/imani-bahati-LxVxPA1LOVM-unsplash.jpg"
              alt="Hero background"
              fill
              className="object-cover"
              priority
              quality={90}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30"></div>
          </div>
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative max-w-3xl mx-auto text-center text-white z-10"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight drop-shadow-lg">
                สัมผัสความสดใส
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  ในคอลเลกชันฤดูร้อน 2025
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-200">
                ค้นพบสไตล์ใหม่ที่บ่งบอกความเป็นคุณ พร้อมรับส่วนลดพิเศษ!
              </p>
              <Link href="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-5 bg-white text-black font-semibold rounded-full text-lg
                    hover:bg-gray-100 transition-all duration-300 flex items-center justify-center mx-auto gap-2 shadow-lg"
                >
                  ช้อปเลย! <FiArrowRight className="ml-2" />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <FiTruck className="w-8 h-8" />,
                  title: "จัดส่งฟรี",
                  desc: "สำหรับคำสั่งซื้อ 1,000 บาทขึ้นไป",
                },
                {
                  icon: <FiLock className="w-8 h-8" />,
                  title: "การชำระเงินที่ปลอดภัย",
                  desc: "รับประกันความปลอดภัย 100%",
                },
                {
                  icon: <FiStar className="w-8 h-8" />,
                  title: "สินค้าคุณภาพ",
                  desc: "รับประกันความพึงพอใจ",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center text-center p-6"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-blue-600">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Highlights */}
        <section className="py-16 container mx-auto px-4" id="categories">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              เลือกซื้อตามหมวดหมู่
            </h2>
            <p className="text-gray-600 text-lg">
              ค้นพบคอลเลกชันที่หลากหลายของเรา
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.slice(0, 4).map((category, index) => (
              <motion.div
                key={category.id || category.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                onMouseEnter={() => setHoveredCategory(index)}
                onMouseLeave={() => setHoveredCategory(null)}
                className="group relative h-[250px] overflow-hidden rounded-2xl shadow-lg"
              >
                <Image
                  src={
                    category.image ||
                    "/homePageImages/nimble-made-hMMXhKSZk7k-unsplash.jpg"
                  }
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <Link href={`/products?category=${category.id}`}>
                  {" "}
                  {/* Use id for real filter */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 text-white transition-all duration-300">
                    <h3 className="text-2xl font-bold mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      {category.name}
                    </h3>
                    <p className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100">
                      {category.description || "ค้นพบคอลเลกชันใหม่"}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16 bg-gray-50" id="featured">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                สินค้าแนะนำ
              </h2>
              <p className="text-gray-600 text-lg">
                เลือกช้อปสินค้ายอดนิยมของเรา
              </p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5  gap-6">
              {loading
                ? Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-60 bg-gray-200 animate-pulse rounded-2xl"
                    />
                  ))
                : products
                    .slice(0, 4)
                    .map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
            </div>
          </div>
        </section>

        {/* Collections Section */}
        <section className="py-16 container mx-auto px-4" id="collections">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              คอลเลกชันพิเศษ
            </h2>
            <p className="text-gray-600 text-lg">
              พบกับคอลเลกชันสุดพิเศษที่คัดสรรมาเพื่อคุณ
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {collections.map((col, idx) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="relative h-80 rounded-2xl overflow-hidden shadow-xl group"
              >
                <Image
                  src={col.image}
                  alt={col.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 text-white z-10">
                  <h3 className="text-3xl font-bold mb-2 drop-shadow-lg">
                    {col.name}
                  </h3>
                  <p className="text-lg mb-4 drop-shadow">{col.description}</p>
                  <Link
                    href={col.link}
                    className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-full shadow hover:bg-blue-100 transition"
                  >
                    ดูคอลเลกชัน
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Reviews Section */}
        <section className="py-16 container mx-auto px-4" id="reviews">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              เสียงจากลูกค้า
            </h2>
            <p className="text-gray-600 text-lg">ประสบการณ์จากผู้ใช้จริง</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* TODO: Replace with real API data */}
            {[
              {
                name: "เจนจิรา ดวงแก้ว",
                handle: "@janejira.d",
                quote:
                  "ชอบคุณภาพและการตัดเย็บมาก! แนะนำเลยค่ะ ไม่ผิดหวังแน่นอน.",
              },
              {
                name: "สมศักดิ์ ชัยชนะ",
                handle: "@somsak.c",
                quote:
                  "สินค้าตรงปก ส่งไว ประทับใจมากครับ จะกลับมาอุดหนุนอีกแน่นอน.",
              },
              {
                name: "อรุณี สุขใจ",
                handle: "@arunee.s",
                quote: "เนื้อผ้าดี ใส่สบาย ลวดลายสวยงามค่ะ จัดส่งรวดเร็วทันใจ.",
              },
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col">
                  <div className="flex-grow">
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      "{testimonial.quote}"
                    </p>
                  </div>
                  <div className="flex items-center mt-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-xl">
                        {testimonial.name[0]}
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900">
                        {testimonial.name}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {testimonial.handle}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Brands Section */}
        <section className="py-16 bg-gray-50" id="brands">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              แบรนด์ชั้นนำ
            </h2>
            <p className="text-gray-600 text-lg">
              แบรนด์ที่ได้รับความไว้วางใจจากลูกค้า
            </p>
          </motion.div>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {brands.length === 0
              ? [
                  { name: "Brand A", logo: "/images/placeholder.svg" },
                  { name: "Brand B", logo: "/images/placeholder.svg" },
                  { name: "Brand C", logo: "/images/placeholder.svg" },
                  { name: "Brand D", logo: "/images/placeholder.svg" },
                ].map((brand, idx) => (
                  <div
                    key={idx}
                    className="w-32 h-20 bg-white rounded-xl flex items-center justify-center shadow hover:shadow-lg transition-all duration-300 grayscale hover:grayscale-0 cursor-pointer"
                  >
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      width={100}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                ))
              : brands.map((brand, idx) => (
                  <div
                    key={brand.id || idx}
                    className="w-32 h-20 bg-white rounded-xl flex items-center justify-center shadow hover:shadow-lg transition-all duration-300 grayscale hover:grayscale-0 cursor-pointer"
                  >
                    <Image
                      src={brand.logo || "/images/placeholder.svg"}
                      alt={brand.name}
                      width={100}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                ))}
          </div>
        </section>

        {/* Promo/Flash Sale Section */}
        <section className="py-16 container mx-auto px-4" id="promo">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              โปรโมชัน/Flash Sale
            </h2>
            <p className="text-gray-600 text-lg">
              ห้ามพลาดกับดีลสุดพิเศษประจำวันนี้!
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {promos.map((promo, idx) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="relative h-64 rounded-2xl overflow-hidden shadow-xl group"
              >
                <Image
                  src={promo.image}
                  alt={promo.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 text-white z-10">
                  <span className="inline-block bg-pink-500 px-4 py-1 rounded-full text-xs font-bold mb-2">
                    {promo.badge}
                  </span>
                  <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">
                    {promo.title}
                  </h3>
                  <p className="text-lg mb-4 drop-shadow">{promo.desc}</p>
                  <Link
                    href={promo.link}
                    className="inline-block px-6 py-3 bg-white text-pink-600 font-semibold rounded-full shadow hover:bg-pink-100 transition"
                  >
                    ดูโปรโมชัน
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                รับข่าวสารและโปรโมชันก่อนใคร
              </h2>
              <p className="text-lg text-gray-200 mb-8">
                สมัครรับจดหมายข่าวเพื่อรับส่วนลดพิเศษ 10%
                สำหรับการสั่งซื้อครั้งแรก
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <input
                  type="email"
                  placeholder="กรอกอีเมลของคุณ"
                  className="px-6 py-4 rounded-full text-black w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-200"
                >
                  สมัครรับข่าวสาร
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
