# Middlewares Overview

- **authMiddleware.js**  
  ตรวจสอบ JWT/cookie/session, ดึง user จาก DB, set req.user, ตรวจสอบ owner

- **authorizationMiddleware.js**  
  ตรวจสอบ role/permission ของ user (requireRole, requireAnyRole, requireOwnership, requirePermission)

- **errorHandler.js**  
  Middleware สำหรับจัดการ error ทั้งหมดในระบบ (Zod, ApiError, JWT, DB, etc.)

- **fileUploadMiddleware.js**  
  จัดการ upload ไฟล์ (image) ด้วย multer, handle error ของ multer

- **rateLimiter.js**  
  Rate limit สำหรับ API, login, register, ฯลฯ (ใช้ Redis store)

- **validationMiddleware.js**  
   ตรวจสอบข้อมูล input ด้วย Zod schema
