# รายละเอียด DTO (Data Transfer Object)

เอกสารนี้อธิบายหน้าที่ของแต่ละ DTO, route ที่เรียกใช้, และตรวจสอบความครอบคลุมของ validation ในแต่ละ endpoint

---

## address.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลที่อยู่ (สร้าง/แก้ไข)
- **ถูกใช้ใน:** addressRoutes.js
  - `/` (POST): createAddress
  - `/:id` (PUT): updateAddress
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## admin ไม่มี DTO แยก (ใช้ validation อื่นหรือไม่ต้อง validate)

---

## auth.dto.js

- **หน้าที่:** ตรวจสอบข้อมูล auth (สมัคร, ล็อกอิน, ลืมรหัส, เปลี่ยนรหัส, refresh, logout)
- **ถูกใช้ใน:** authRoutes.js
  - `/register`, `/login`, `/forgot-password`, `/reset-password`, `/change-password`, `/refresh-token`, `/logout` (POST)
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## brand.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลแบรนด์ (สร้าง/แก้ไข)
- **ถูกใช้ใน:** brandRoutes.js
  - `/` (POST): createBrand
  - `/:id` (PUT): updateBrand
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## cart.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลตะกร้าสินค้า (เพิ่ม/อัปเดต/รวมตะกร้า)
- **ถูกใช้ใน:** cartRoutes.js
  - `/items` (POST): addItem
  - `/items/:itemId` (PUT): updateItem
  - `/merge` (POST): mergeGuestCart
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## category.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลหมวดหมู่ (สร้าง/แก้ไข)
- **ถูกใช้ใน:** categoryRoutes.js
  - `/` (POST): createCategory
  - `/:id` (PUT): updateCategory
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## collection.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลคอลเลกชัน (สร้าง/แก้ไข/เพิ่ม/ลบสินค้าในคอลเลกชัน)
- **ถูกใช้ใน:** collectionRoutes.js
  - `/` (POST): createCollection
  - `/:id` (PUT): updateCollection
  - `/:id/products` (POST): addProducts
  - `/:id/products` (DELETE): removeProducts
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## coupon.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลคูปอง (สร้าง/แก้ไข)
- **ถูกใช้ใน:** couponRoutes.js
  - `/` (POST): createCoupon
  - `/:id` (PUT): updateCoupon
- **ครอบคลุม:** ครอบคลุมเฉพาะ endpoint ที่ต้องการ validation (activate/deactivate ไม่ต้อง validate)

---

## inventory.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลสต็อก (สร้าง/แก้ไข/ปรับ/โอน)
- **ถูกใช้ใน:** inventoryRoutes.js
  - `/` (POST): createInventoryItem
  - `/:id` (PUT): updateInventoryItem
  - `/:id/adjust` (POST): adjustInventory
  - `/:id/transfer` (POST): transferInventory
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## loyalty.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลสะสมแต้ม/รางวัล (แลก/สร้าง/แก้ไขรางวัล/ระดับ)
- **ถูกใช้ใน:** loyaltyRoutes.js
  - `/rewards/redeem/:id` (POST): redeemReward
  - `/tiers` (POST): createReward
  - `/tiers/:id` (PUT): updateReward
  - `/rewards` (POST): createReward
  - `/rewards/:id` (PUT): updateReward
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## notification.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลแจ้งเตือน (สร้าง/แก้ไข/ลบ/อ่าน)
- **ถูกใช้ใน:** notificationRoutes.js
  - `/:id/read`, `/read-all` (PUT): markAsRead
  - `/:id` (DELETE): deleteNotification
  - `/` (POST): createNotification
  - `/:id` (PUT): updateNotification
  - `/admin/:id` (DELETE): deleteNotification
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## order.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลออเดอร์ (checkout, cancel, refund, update status/shipping)
- **ถูกใช้ใน:** orderRoutes.js
  - `/checkout` (POST): checkout
  - `/:orderId/cancel` (POST): cancelOrder
  - `/:orderId/refund` (POST): refundOrder
  - `/:orderId/status` (PATCH): updateOrderStatus
  - `/admin/:orderId/status` (PUT): updateOrderStatus
  - `/admin/:orderId/shipping` (PUT): updateShippingInfo
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## payment.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลการชำระเงิน (สร้าง/verify/refund/token)
- **ถูกใช้ใน:** paymentRoutes.js
  - `/` (POST): createPayment
  - `/:id/verify` (POST): verifyPayment
  - `/create` (POST): createPayment
  - `/:paymentId/refund` (POST): processRefund
  - `/token` (POST): createToken
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## product.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลสินค้า/รีวิว/ตัวเลือกสินค้า (สร้าง/แก้ไข)
- **ถูกใช้ใน:** productRoutes.js
  - `/:id/review` (POST): createReview
  - `/:id/review/:reviewId` (PUT): updateReview
  - `/` (POST): createProduct
  - `/:id` (PUT): updateProduct
  - `/:id/variants` (POST): createVariant
  - `/:id/variants/:variantId` (PUT): updateVariant
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## report.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลสำหรับสร้างรายงานแต่ละประเภท
- **ถูกใช้ใน:** reportRoutes.js
  - `/sales` (GET): generateSalesReport
  - `/inventory` (GET): generateInventoryReport
  - `/customer` (GET): generateCustomerReport
  - `/supplier` (GET): generateSupplierReport
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## review.dto.js

- **หน้าที่:** (ใช้ใน product.dto.js แล้ว ไม่พบการเรียกตรงใน route)
- **ถูกใช้ใน:** product.dto.js (ภายใน)
- **ครอบคลุม:** ครบถ้วนสำหรับ validation รีวิวสินค้า

---

## shipping.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลขนส่ง (สร้าง/แก้ไข/วิธี/โซน/label)
- **ถูกใช้ใน:** shippingRoutes.js
  - `/methods` (POST): createShippingMethod
  - `/methods/:id` (PUT): updateShippingMethod
  - `/zones` (POST): createShippingZone
  - `/zones/:id` (PUT): updateShippingZone
  - `/` (POST): createShipment
  - `/:id` (PUT): updateShipment
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## store.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลร้านค้า (สร้าง/แก้ไข/ตั้งค่า)
- **ถูกใช้ใน:** storeRoutes.js
  - `/` (POST): createStore
  - `/:id` (PUT): updateStore
  - `/:id/settings` (PUT): updateStoreSettings
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## supplier.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลซัพพลายเออร์/สินค้าในซัพพลายเออร์ (สร้าง/แก้ไข/เพิ่ม/ลบ)
- **ถูกใช้ใน:** supplierRoutes.js
  - `/` (POST): createSupplier
  - `/:id` (PUT): updateSupplier
  - `/:id/products` (POST): addSupplierProduct
  - `/:id/products/:productId` (PUT): updateSupplierProduct
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## user.dto.js

- **หน้าที่:** ตรวจสอบข้อมูลผู้ใช้ (สร้าง/แก้ไข/อัปเดต role/ตั้งค่า)
- **ถูกใช้ใน:** userRoutes.js
  - `/preferences` (PUT): updatePreferences
  - `/create` (POST): createUser
  - `/:userId/role` (PUT): updateRole
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

## wishlist.dto.js

- **หน้าที่:** ตรวจสอบข้อมูล wishlist (เพิ่ม/แก้ไข/ลบ/ย้ายไปตะกร้า)
- **ถูกใช้ใน:** wishlistRoutes.js
  - `/` (POST): addToWishlist
  - `/:id` (PUT): updateWishlistItem
  - `/:id` (DELETE): removeFromWishlist
  - `/:id/move-to-cart` (POST): moveToCart
- **ครอบคลุม:** ครบถ้วนสำหรับ endpoint ที่ต้องการ validation

---

**สรุป:**

- ทุก route ที่มีการรับข้อมูลจาก client และต้องการ validation มี DTO ครอบคลุมครบถ้วน
- ไม่พบ route ที่ขาด DTO ที่ควรมี
- DTO บางอัน (เช่น review.dto.js) อาจถูกใช้ภายใน controller/service หรือโดย DTO อื่น (เช่น product.dto.js)
- หากมีการเพิ่ม endpoint ใหม่ที่รับข้อมูลจาก client ควรสร้าง/ขยาย DTO ให้ครอบคลุมเสมอ
