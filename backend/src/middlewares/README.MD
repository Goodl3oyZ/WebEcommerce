# Middlewares Overview

- **auditLogMiddleware.js**  
  บันทึก log ทุก request/response ลงฐานข้อมูล (ยังไม่ได้ใช้งานจริง)

- **authMiddleware.js**  
  ตรวจสอบ JWT/cookie/session, ดึง user จาก DB, set req.user, ตรวจสอบ owner

- **authorizationMiddleware.js**  
  ตรวจสอบ role/permission ของ user (requireRole, requireAnyRole, requireOwnership, requirePermission)

- **errorHandler.js**  
  Middleware สำหรับจัดการ error ทั้งหมดในระบบ (Zod, ApiError, JWT, DB, etc.)

- **fileUploadMiddleware.js**  
  จัดการ upload ไฟล์ (image) ด้วย multer, handle error ของ multer

- **loggingMiddleware.js**  
  บันทึก request log และ error log ด้วย winston (ยังไม่ได้ใช้งานจริง)

- **passwordStrengthMiddleware.js**  
  ตรวจสอบความแข็งแรงของรหัสผ่าน (ยังไม่ได้ใช้งานจริง)

- **rateLimiter.js**  
  Rate limit สำหรับ API, login, register, ฯลฯ (ใช้ Redis store)

- **sanitizeMiddleware.js**  
  sanitize input (body, query, params) ตัด HTML/special char (ยังไม่ได้ใช้งานจริง)

- **validationMiddleware.js**  
   ตรวจสอบข้อมูล input ด้วย Zod schema
