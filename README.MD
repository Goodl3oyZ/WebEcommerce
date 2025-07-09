# Project Overview

This project is a full-stack e-commerce platform, consisting of a frontend (Next.js/React) and a backend (Node.js/Express). The system is designed to provide a seamless shopping experience, robust management tools, and scalable architecture.

---

## ระบบหลักของโปรเจกต์ (Main Systems)

### 1️⃣ ระบบข้อมูลผู้ใช้ (User Profile / Manage Account)

- **ฟีเจอร์:** ดู/แก้ไขข้อมูลส่วนตัว, ที่อยู่, password
- **ตารางที่เกี่ยวข้อง:**
  - `users` (ข้อมูลผู้ใช้)
  - `addresses` (ที่อยู่)
  - `user_social_links` (โซเชียลลิงก์)

### 2️⃣ ระบบสินค้า (Product Listing / Catalog)

- **ฟีเจอร์:** แสดงรายการสินค้า, ค้นหา, กรองหมวดหมู่/แบรนด์
- **ตารางที่เกี่ยวข้อง:**
  - `products`, `brands`, `categories`, `product_variants`, `product_attributes`, `product_tags`, `product_tags_to_products`, `collections`, `collection_products`, `product_discounts`, `category_discounts`, `store_inventory`

### 3️⃣ ระบบตะกร้าสินค้า (Cart / Wishlist)

- **ฟีเจอร์:** เพิ่ม/ลบสินค้าในตะกร้า, wish list
- **ตารางที่เกี่ยวข้อง:**
  - `carts`, `cart_items`, `wishlist_items`

### 4️⃣ ระบบสั่งซื้อ (Checkout / Order)

- **ฟีเจอร์:** ทำรายการสั่งซื้อ, เลือกวิธีชำระเงิน/จัดส่ง
- **ตารางที่เกี่ยวข้อง:**
  - `orders`, `order_items`, `payment_methods`, `payment_transactions`, `order_coupons`, `shipments`, `shipping_methods`, `shipping_rates`, `shipping_zones`, `store_pickups`

### 5️⃣ ระบบคูปองและส่วนลด (Coupons & Discounts)

- **ฟีเจอร์:** ใช้คูปอง, auto discount
- **ตารางที่เกี่ยวข้อง:**
  - `coupons`, `discounts`, `order_coupons`, `product_discounts`, `category_discounts`

### 6️⃣ ระบบจัดส่ง / ติดตามสถานะ (Shipping & Tracking)

- **ฟีเจอร์:** ติดตามสถานะคำสั่งซื้อ, การจัดส่ง
- **ตารางที่เกี่ยวข้อง:**
  - `order_status_history`, `shipments`, `shipping_history`

### 7️⃣ ระบบรีวิว (Review System)

- **ฟีเจอร์:** รีวิวสินค้า/ร้าน
- **ตารางที่เกี่ยวข้อง:**
  - `product_reviews`, `store_reviews`

### 8️⃣ ระบบ Loyalty / คะแนนสะสม (Loyalty & Points)

- **ฟีเจอร์:** สะสม/ใช้แต้ม
- **ตารางที่เกี่ยวข้อง:**
  - `loyalty_programs`, `points_history`

### 9️⃣ ระบบร้านค้า (Seller / Store Management)

- **ฟีเจอร์:** ข้อมูลร้าน, การตั้งค่าร้าน, การตั้งค่าชำระเงิน
- **ตารางที่เกี่ยวข้อง:**
  - `stores`, `store_settings`, `store_inventory`, `store_payment_settings`, `store_reviews`

### 10️⃣ ระบบแจ้งเตือน (Notification)

- **ฟีเจอร์:** แจ้งเตือนสถานะสั่งซื้อ, โปรโมชั่น ฯลฯ
- **ตารางที่เกี่ยวข้อง:**
  - `notifications`

---

## Quick Start

### Frontend Setup

- `cd frontend`
- `npm install`
- `npm run dev`

### Backend Setup

- `cd backend`
- `npm install`
- `node index.js`

---

## Additional Notes

- ระบบนี้ออกแบบมาเพื่อรองรับการขยายฟีเจอร์ในอนาคต เช่น ระบบแชท, ระบบวิเคราะห์ข้อมูล ฯลฯ
- สามารถปรับแต่งและเพิ่มเติมโมดูลได้ตามความต้องการของธุรกิจ

paymenttransaction เหมือนไม่มี order id กับ payment method id tracnsaction id and paymaent detail ทั้ง 4 เป็น null
