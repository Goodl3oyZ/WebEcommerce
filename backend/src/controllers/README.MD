# สรุปหน้าที่และการจัดการ Error ของ Controllers

เอกสารนี้สรุปหน้าที่ของแต่ละ controller และรูปแบบการจัดการ error ที่สำคัญในโปรเจกต์นี้

| Controller                    | หน้าที่หลัก                                                                          | การจัดการ Error / Import ที่สำคัญ         |
| ----------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| **addressController.js**      | จัดการที่อยู่ผู้ใช้: เพิ่ม, แก้ไข, ลบ, ตั้งค่าหลัก (user/admin)                      | ใช้ `ApiError`                            |
| **paymentController.js**      | จัดการการชำระเงิน: สร้าง, คืนเงิน, ตรวจสอบสถานะ, เชื่อม Omise                        | ใช้ `ApiError`                            |
| **productController.js**      | จัดการสินค้า: ดู, สร้าง, แก้ไข, ลบ, รีวิว, จัดการ variant                            | ใช้ `ApiError`                            |
| **cartController.js**         | จัดการตะกร้า: เพิ่ม, ลบ, อัปเดต, checkout, รวม guest cart                            | ใช้ `ApiError`                            |
| **brandController.js**        | จัดการแบรนด์: ดู, สร้าง, แก้ไข, ลบ, อัปเดตโลโก้/visibility                           | ใช้ `ApiError`                            |
| **userController.js**         | จัดการข้อมูลผู้ใช้: โปรไฟล์, คำสั่งซื้อ, คะแนน, admin สร้าง/ลบ user                  | ใช้ `ApiError`                            |
| **categoryController.js**     | จัดการหมวดหมู่: ดู, สร้าง, แก้ไข, ลบ, อัปเดตลำดับ/visibility                         | ใช้ `ApiError`                            |
| **collectionController.js**   | จัดการคอลเลกชัน: ดู, สร้าง, แก้ไข, ลบ, เพิ่ม/ลบสินค้าในคอลเลกชัน                     | ใช้ `ApiError`                            |
| **orderController.js**        | จัดการออเดอร์: ดู, สร้าง, ยกเลิก, ขอคืนเงิน, สถานะ (user/admin)                      | ใช้ `ApiError`                            |
| **oauthController.js**        | OAuth callback, getMe, logout (เชื่อม session/userController)                        | ไม่ใช้ `ApiError` (redirect/error ธรรมดา) |
| **addressDataController.js**  | ดึงข้อมูลจังหวัด อำเภอ ตำบล (lookup address data)                                    | ไม่ใช้ `ApiError` (error ธรรมดา)          |
| **uploadController.js**       | อัปโหลด/ลบไฟล์รูปภาพ (avatar, product, brand, store, review)                         | ไม่ใช้ `ApiError` (error ธรรมดา)          |
| **shippingController.js**     | จัดการขนส่ง: คำนวณค่าส่ง, ติดตาม, เพิ่ม/ลบ/อัปเดตที่อยู่ขนส่ง, carrier, method, zone | ใช้ `error.message` (ไม่ใช้ ApiError)     |
| **authController.js**         | จัดการ auth: register, login, refresh token, reset password, verify email            | ใช้ `error.message` (ไม่ใช้ ApiError)     |
| **adminController.js**        | สำหรับ admin: จัดการ user, product, order, สถิติ                                     | ใช้ `error.message` (ไม่ใช้ ApiError)     |
| **wishlistController.js**     | จัดการ wishlist: เพิ่ม, ลบ, ย้ายไป cart (user/admin)                                 | ใช้ `next(error)` (ไม่ใช้ ApiError)       |
| **notificationController.js** | จัดการ notification: ดู, สร้าง, ลบ, อัปเดต (user/admin)                              | ใช้ `AppError` และ `catchAsync`           |
| **inventoryController.js**    | จัดการสต็อก: ดู, เพิ่ม, โอน, ปรับ, ดูตาม location/product                            | ใช้ `next(error)` (ไม่ใช้ ApiError)       |
| **reportController.js**       | สร้าง report: sales, inventory, customer, supplier                                   | ใช้ `AppError` และ `catchAsync`           |
| **supplierController.js**     | จัดการ supplier: ดู, เพิ่ม, ลบ, จัดการสินค้า supplier                                | ใช้ `AppError` และ `catchAsync`           |
| **loyaltyController.js**      | จัดการ loyalty: point, reward, tier, สถิติ                                           | ใช้ `ApiError`                            |
| **couponController.js**       | จัดการคูปอง: validate, สร้าง, แก้ไข, ลบ, สถิติ                                       | ใช้ `ApiError`                            |
| **storeController.js**        | จัดการร้านค้า: สร้าง, ดู, อัปเดต, ลบ, สินค้า, ออเดอร์, analytics, settings           | ใช้ `error.message` (ไม่ใช้ ApiError)     |

---

**หมายเหตุ**

- Controller ที่ใช้ `ApiError` จะมีการจัดการ error แบบ standardized
- บาง controller ใช้ `AppError`, `error.message` หรือ `next(error)` ตามความเหมาะสม
- Controller ที่เกี่ยวกับข้อมูล lookup หรือ OAuth มักจะไม่ใช้ `ApiError`
- ฟังก์ชันที่เกี่ยวกับไฟล์ (upload) หรือข้อมูลที่อยู่ (address data) ใช้ error handling แบบธรรมดา
