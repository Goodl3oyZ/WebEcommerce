\*src/
├── config/ # การตั้งค่าทั่วไปของโปรเจค
│ ├── db.js # การตั้งค่าการเชื่อมต่อฐานข้อมูล (PostgreSQL)
│ ├── dotenv.js # โหลดตัวแปรจาก .env
│ └── drizzle.config.js # การตั้งค่าสำหรับ drizzle-orm
│
├── controllers/ # จัดการคำขอ (Request Handlers)
│ ├── authController.js # จัดการคำขอเกี่ยวกับการยืนยันตัวตน (เช่น /register, /login)
│ └── userController.js # จัดการคำขอเกี่ยวกับผู้ใช้ (เช่น /users)
│
├── middlewares/ # Middleware สำหรับ Express
│ ├── authMiddleware.js # ตรวจสอบ JWT Token
│ └── errorHandler.js # จัดการข้อผิดพลาดใน API
│
├── models/ # โมเดลสำหรับฐานข้อมูล
│ ├── schema.js # Schema ของ drizzle-orm (เช่น users, tables)
│ └── User.js # โมเดลสำหรับผู้ใช้ (อาจใช้ร่วมกับ ORM อื่น)
│
├── routes/ # กำหนดเส้นทาง (Routes)
│ ├── authRoutes.js # เส้นทางสำหรับการยืนยันตัวตน (เช่น POST /register)
│ └── userRoutes.js # เส้นทางสำหรับข้อมูลผู้ใช้ (เช่น GET /users)
│
├── services/ # ธุรกิจลอจิก (Business Logic)
│ ├── userService.js # จัดการลอจิกเกี่ยวกับผู้ใช้ (เช่น การสร้างผู้ใช้)
│ └── authService.js # จัดการลอจิกเกี่ยวกับการยืนยันตัวตน
│
├── utils/ # ฟังก์ชันช่วยเหลือ (Utility Functions)
│ ├── hashPassword.js # ฟังก์ชันสำหรับแฮชรหัสผ่าน
│ ├── jwtHelper.js # ฟังก์ชันสำหรับจัดการ JWT
│ └── logger.js # ฟังก์ชันสำหรับจัดการ log
│
├── seed/ # ไฟล์สำหรับการ seed ข้อมูล
│ └── seed.js # สร้างข้อมูลเริ่มต้นในฐานข้อมูล
│
└── index.js # จุดเริ่มต้นของโปรเจค (Entry Point)

How to run
npx drizzle-kit generate
npx drizzle-kit push
npx drizzle-kit migrate

flow each interation

index.js
↓
routes/userRoutes.js <-- define path
↓
controllers/userController.js <-- 1 handle req/res , 2 Middleware (อาจอยู่ก่อน controller) เช่น authentication, logging, validation
↓
services/userService.js <-- business logic
↓
models/userModel.js <-- DB access
↓
Database Table: users
