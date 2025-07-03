# รายละเอียดการทำงานของแต่ละ Route

เอกสารนี้อธิบายการทำงานของแต่ละ route ในระบบ พร้อมระบุ controller และ service ที่เกี่ยวข้อง

---

## addressRoutes.js

- **หน้าที่:** จัดการที่อยู่ของผู้ใช้ (เพิ่ม, แก้ไข, ลบ, ตั้งค่าหลัก, ดูที่อยู่)
- **Controller:** addressController
- **Service ที่เกี่ยวข้อง:** addressService
- **รายละเอียด:**
  - `/` (GET, POST): ดู/เพิ่มที่อยู่ของผู้ใช้
  - `/:id` (PUT, DELETE): แก้ไข/ลบที่อยู่
  - `/:id/default` (PUT): ตั้งค่าที่อยู่หลัก
  - `/admin/*`: สำหรับแอดมินดู/ค้นหาที่อยู่ทั้งหมดหรือของผู้ใช้แต่ละคน

---

## addressDataRoutes.js

- **หน้าที่:** ดึงข้อมูลจังหวัด อำเภอ ตำบล (สำหรับฟอร์มที่อยู่)
- **Controller:** addressDataController
- **Service ที่เกี่ยวข้อง:** addressDataService
- **รายละเอียด:**
  - `/provinces`, `/districts`, `/subdistricts` (GET): ดึงข้อมูลแต่ละระดับ

---

## authRoutes.js

- **หน้าที่:** จัดการ authentication (สมัคร, ล็อกอิน, ลืมรหัส, เปลี่ยนรหัส, refresh token, logout)
- **Controller:** authController
- **Service ที่เกี่ยวข้อง:** authService, sessionService
- **รายละเอียด:**
  - `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email` (POST/GET): สมัคร, เข้าสู่ระบบ, รีเซ็ตรหัส, ยืนยันอีเมล
  - `/change-password`, `/refresh-token`, `/logout`, `/logout-all` (POST): จัดการ session และรหัสผ่าน (ต้องล็อกอิน)

---

## brandRoutes.js

- **หน้าที่:** จัดการข้อมูลแบรนด์สินค้า
- **Controller:** brandController
- **Service ที่เกี่ยวข้อง:** brandService
- **รายละเอียด:**
  - `/` (GET): ดูรายชื่อแบรนด์
  - `/:id` (GET): ดูรายละเอียดแบรนด์
  - `/:id/products` (GET): ดูสินค้าทั้งหมดในแบรนด์
  - `/` (POST), `/:id` (PUT, DELETE): เพิ่ม/แก้ไข/ลบแบรนด์ (เฉพาะแอดมิน)

---

## cartRoutes.js

- **หน้าที่:** จัดการตะกร้าสินค้า (เพิ่ม, ลบ, อัปเดต, checkout)
- **Controller:** cartController
- **Service ที่เกี่ยวข้อง:** cartService, productService
- **รายละเอียด:**
  - `/` (GET): ดูตะกร้าสินค้าของผู้ใช้
  - `/items` (POST, PUT, DELETE): เพิ่ม/อัปเดต/ลบสินค้าในตะกร้า
  - `/items` (DELETE): เคลียร์ตะกร้าทั้งหมด
  - `/checkout` (POST): ดำเนินการ checkout
  - `/merge` (POST): รวมตะกร้าจาก guest

---

## categoryRoutes.js

- **หน้าที่:** จัดการหมวดหมู่สินค้า
- **Controller:** categoryController
- **Service ที่เกี่ยวข้อง:** categoryService
- **รายละเอียด:**
  - `/` (GET): ดูหมวดหมู่ทั้งหมด
  - `/:id` (GET): ดูรายละเอียดหมวดหมู่
  - `/:id/products` (GET): ดูสินค้าทั้งหมดในหมวดหมู่
  - `/` (POST), `/:id` (PUT, DELETE): เพิ่ม/แก้ไข/ลบหมวดหมู่ (เฉพาะแอดมิน)

---

## collectionRoutes.js

- **หน้าที่:** จัดการคอลเลกชันสินค้า (กลุ่มสินค้าพิเศษ)
- **Controller:** collectionController
- **Service ที่เกี่ยวข้อง:** collectionService
- **รายละเอียด:**
  - `/` (GET): ดูคอลเลกชันทั้งหมด
  - `/:id` (GET): ดูรายละเอียดคอลเลกชัน
  - `/:id/products` (GET): ดูสินค้าทั้งหมดในคอลเลกชัน
  - `/` (POST), `/:id` (PUT, DELETE): เพิ่ม/แก้ไข/ลบคอลเลกชัน (เฉพาะแอดมิน)
  - `/:id/products` (POST, DELETE): เพิ่ม/ลบสินค้าจากคอลเลกชัน (เฉพาะแอดมิน)

---

## couponRoutes.js

- **หน้าที่:** จัดการคูปองส่วนลด
- **Controller:** couponController
- **Service ที่เกี่ยวข้อง:** couponService
- **รายละเอียด:**
  - `/validate`, `/available` (GET): ตรวจสอบ/ดูคูปองที่ใช้ได้ (ต้องล็อกอิน)
  - `/` (POST, PUT, DELETE): เพิ่ม/แก้ไข/ลบคูปอง (เฉพาะแอดมิน)
  - `/statistics` (GET): สถิติคูปอง
  - `/:id/activate`, `/:id/deactivate` (POST): เปิด/ปิดคูปอง

---

## inventoryRoutes.js

- **หน้าที่:** จัดการสต็อกสินค้า
- **Controller:** inventoryController
- **Service ที่เกี่ยวข้อง:** inventoryService
- **รายละเอียด:**
  - `/` (GET, POST): ดู/เพิ่มรายการสต็อก (แอดมิน)
  - `/:id` (GET, PUT): ดู/แก้ไขรายการสต็อก (แอดมิน)
  - `/:id/adjust`, `/:id/transfer` (POST): ปรับ/โอนสต็อก (แอดมิน)
  - `/product/:productId`, `/location/:location` (GET): ดูสต็อกตามสินค้า/ที่ตั้ง
  - `/low-stock` (GET): ดูสินค้าคงเหลือน้อย

---

## loyaltyRoutes.js

- **หน้าที่:** จัดการระบบสะสมแต้มและรางวัล
- **Controller:** loyaltyController
- **Service ที่เกี่ยวข้อง:** loyaltyService
- **รายละเอียด:**
  - `/points`, `/history`, `/rewards` (GET): ดูแต้ม, ประวัติ, รางวัลที่แลกได้
  - `/rewards/redeem/:id` (POST): แลกรางวัล
  - `/statistics`, `/tiers` (GET): สถิติ/ระดับสมาชิก (แอดมิน)
  - `/tiers` (POST, PUT): เพิ่ม/แก้ไขระดับสมาชิก (แอดมิน)
  - `/rewards` (POST, PUT, DELETE): เพิ่ม/แก้ไข/ลบรางวัล (แอดมิน)

---

## notificationRoutes.js

- **หน้าที่:** จัดการการแจ้งเตือน
- **Controller:** notificationController
- **Service ที่เกี่ยวข้อง:** notificationService
- **รายละเอียด:**
  - `/` (GET): ดูการแจ้งเตือนของผู้ใช้
  - `/:id` (GET, PUT, DELETE): ดู/อ่าน/ลบการแจ้งเตือน
  - `/read-all` (PUT): อ่านการแจ้งเตือนทั้งหมด
  - `/` (POST, PUT, DELETE): สร้าง/แก้ไข/ลบการแจ้งเตือน (แอดมิน)
  - `/admin/all`, `/admin/:id` (GET): ดูการแจ้งเตือนทั้งหมด/ตาม id (แอดมิน)

---

## orderRoutes.js

- **หน้าที่:** จัดการออเดอร์ (สั่งซื้อ, ยกเลิก, คืนเงิน, สถานะ)
- **Controller:** orderController
- **Service ที่เกี่ยวข้อง:** orderService
- **รายละเอียด:**
  - `/` (GET): ดูออเดอร์ของผู้ใช้
  - `/:orderId` (GET): ดูรายละเอียดออเดอร์
  - `/checkout` (POST): สร้างออเดอร์ใหม่
  - `/:orderId/cancel`, `/:orderId/refund` (POST): ยกเลิก/คืนเงินออเดอร์
  - `/admin/all`, `/admin/stats` (GET): ดูออเดอร์/สถิติทั้งหมด (แอดมิน)
  - `/admin/:orderId/status`, `/admin/:orderId/shipping` (PUT): อัปเดตสถานะ/ข้อมูลขนส่ง (แอดมิน)

---

## paymentRoutes.js

- **หน้าที่:** จัดการการชำระเงิน
- **Controller:** paymentController
- **Service ที่เกี่ยวข้อง:** paymentService, omiseService
- **รายละเอียด:**
  - `/methods` (GET): ดูวิธีชำระเงิน
  - `/` (POST): สร้างข้อมูลการชำระเงิน
  - `/stats`, `/history` (GET): สถิติ/ประวัติการชำระเงิน
  - `/:id`, `/:id/status` (GET, PUT): ดู/อัปเดตสถานะการชำระเงิน
  - `/:id/refund` (POST): คืนเงิน (แอดมิน)
  - `/order/:orderId`, `/store/:storeId` (GET): ดูการชำระเงินตามออเดอร์/ร้านค้า
  - `/admin/transactions`, `/admin/statistics` (GET): ดูธุรกรรม/สถิติ (แอดมิน)
  - `/create`, `/token` (POST): สร้างข้อมูล/โทเคนบัตรเครดิต
  - `/webhook/omise` (POST): รับ webhook จาก Omise

---

## productRoutes.js

- **หน้าที่:** จัดการสินค้าและรีวิวสินค้า
- **Controller:** productController
- **Service ที่เกี่ยวข้อง:** productService, reviewService
- **รายละเอียด:**
  - `/` (GET): ดูสินค้าทั้งหมด
  - `/search` (GET): ค้นหาสินค้า
  - `/category/:categoryId` (GET): ดูสินค้าตามหมวดหมู่
  - `/:id` (GET): ดูรายละเอียดสินค้า
  - `/:id/review` (POST, PUT, DELETE): เพิ่ม/แก้ไข/ลบรีวิวสินค้า
  - `/` (POST, PUT, DELETE): เพิ่ม/แก้ไข/ลบสินค้า (แอดมิน)
  - `/:id/variants` (POST, PUT, DELETE): จัดการตัวเลือกสินค้า (แอดมิน)

---

## reportRoutes.js

- **หน้าที่:** สร้างรายงาน (ยอดขาย, สต็อก, ลูกค้า, ซัพพลายเออร์)
- **Controller:** reportController
- **Service ที่เกี่ยวข้อง:** reportService
- **รายละเอียด:**
  - `/sales`, `/inventory`, `/customer`, `/supplier` (GET): สร้างรายงานแต่ละประเภท (แอดมิน)

---

## shippingRoutes.js

- **หน้าที่:** จัดการการขนส่งและติดตามพัสดุ
- **Controller:** shippingController
- **Service ที่เกี่ยวข้อง:** shippingService
- **รายละเอียด:**
  - `/methods`, `/zones` (GET): ดูวิธี/โซนขนส่ง
  - `/calculate` (POST): คำนวณค่าขนส่ง
  - `/tracking/:trackingNumber`, `/order/:orderId` (GET): ติดตามพัสดุ/ดูข้อมูลขนส่งตามออเดอร์
  - `/methods`, `/zones` (POST, PUT, DELETE): จัดการวิธี/โซนขนส่ง (แอดมิน)
  - `/` (POST, PUT, GET): สร้าง/แก้ไข/ดู shipment (แอดมิน)
  - `/stats` (GET): สถิติขนส่ง
  - `/:id/label` (POST, GET): สร้าง/ดู shipping label

---

## storeRoutes.js

- **หน้าที่:** จัดการร้านค้าและข้อมูลร้านค้า
- **Controller:** storeController
- **Service ที่เกี่ยวข้อง:** storeService
- **รายละเอียด:**
  - `/` (GET): ดูสินค้าทั้งหมดในร้าน
  - `/:id` (GET): ดูรายละเอียดร้าน
  - `/:id/products`, `/:id/reviews` (GET): ดูสินค้า/รีวิวในร้าน
  - `/` (POST, PUT, DELETE): เพิ่ม/แก้ไข/ลบร้าน (แอดมิน)
  - `/:id/orders`, `/:id/analytics` (GET): ดูออเดอร์/สถิติร้าน (แอดมิน)
  - `/:id/settings` (PUT): อัปเดตการตั้งค่าร้าน (แอดมิน)

---

## supplierRoutes.js

- **หน้าที่:** จัดการซัพพลายเออร์และสินค้าของซัพพลายเออร์
- **Controller:** supplierController
- **Service ที่เกี่ยวข้อง:** supplierService
- **รายละเอียด:**
  - `/` (GET, POST): ดู/เพิ่มซัพพลายเออร์ (แอดมิน)
  - `/:id` (GET, PUT, DELETE): ดู/แก้ไข/ลบซัพพลายเออร์ (แอดมิน)
  - `/:id/products` (GET, POST, PUT, DELETE): ดู/เพิ่ม/แก้ไข/ลบสินค้าของซัพพลายเออร์ (แอดมิน)

---

## uploadRoutes.js

- **หน้าที่:** อัปโหลด/ลบ/อัปเดตรูปภาพ (avatar, สินค้า, แบรนด์, ร้าน, รีวิว)
- **Controller:** uploadController
- **Service ที่เกี่ยวข้อง:** fileService
- **รายละเอียด:**
  - `/avatar`, `/product`, `/brand`, `/store`, `/review` (POST, PUT, DELETE): อัปโหลด/อัปเดต/ลบรูปภาพแต่ละประเภท

---

## userRoutes.js

- **หน้าที่:** จัดการข้อมูลผู้ใช้ โปรไฟล์ คำสั่งซื้อ แต้ม
- **Controller:** userController
- **Service ที่เกี่ยวข้อง:** userService, orderService, loyaltyService
- **รายละเอียด:**
  - `/profile` (GET, PUT, DELETE): ดู/แก้ไข/ลบโปรไฟล์
  - `/preferences` (GET, PUT): ดู/แก้ไขค่าตั้งค่าผู้ใช้
  - `/orders` (GET): ดูออเดอร์ของผู้ใช้
  - `/points`, `/points/history` (GET): ดูแต้ม/ประวัติแต้ม
  - `/` (GET), `/create` (POST): ดู/สร้างผู้ใช้ (แอดมิน)
  - `/:userId/role` (PUT): อัปเดตบทบาทผู้ใช้ (แอดมิน)

---

## wishlistRoutes.js

- **หน้าที่:** จัดการสินค้าที่อยากได้ (wishlist)
- **Controller:** wishlistController
- **Service ที่เกี่ยวข้อง:** wishlistService, cartService
- **รายละเอียด:**
  - `/` (GET, POST): ดู/เพิ่มสินค้าใน wishlist
  - `/:id` (PUT, DELETE): แก้ไข/ลบสินค้าใน wishlist
  - `/:id/move-to-cart` (POST): ย้ายสินค้าไปตะกร้า
  - `/admin/all`, `/admin/user/:userId`, `/admin/product/:productId` (GET): ดู wishlist ทั้งหมด/ตามผู้ใช้/ตามสินค้า (แอดมิน)

---

## oauthRoutes.js

- **หน้าที่:** จัดการ OAuth login (Google, Facebook, GitHub)
- **Controller:** oauthController
- **Service ที่เกี่ยวข้อง:** ไม่มี (ใช้ passport.js)
- **รายละเอียด:**
  - `/github`, `/google`, `/facebook` (GET): เริ่มต้น OAuth login
  - `/github/callback`, `/google/callback`, `/facebook/callback` (GET): callback หลัง login
  - `/me` (GET): ดูข้อมูลผู้ใช้ที่ล็อกอินผ่าน OAuth
  - `/logout` (GET): ออกจากระบบ OAuth

---
