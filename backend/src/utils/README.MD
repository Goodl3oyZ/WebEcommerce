# utils

โฟลเดอร์นี้รวบรวมฟังก์ชันและคลาสช่วยเหลือ (utility functions & helper classes) ที่ใช้ซ้ำในระบบ backend

## รายละเอียดไฟล์

- **ApiError.js**

  - คลาสสำหรับสร้าง error แบบกำหนด status code/message ได้เอง ใช้สำหรับโยน error ที่ต้องการ response แบบเฉพาะเจาะจง

- **email.js**

  - ฟังก์ชันสำหรับการส่งอีเมล เช่น ส่งอีเมลยืนยันตัวตน, แจ้งเตือน ฯลฯ

- **errorHandler.js**

  - (หลังปรับปรุง) มีเฉพาะ notFoundHandler สำหรับจัดการกรณี route ไม่พบ (404) โดยจะโยน ApiError ออกไปให้ middleware กลางจัดการ

- **hashPassword.js**

  - ฟังก์ชันสำหรับการแฮชรหัสผ่าน (เช่น ใช้ bcrypt) เพื่อความปลอดภัยในการจัดเก็บรหัสผ่านในฐานข้อมูล

- **jwt.js**

  - ฟังก์ชันสำหรับสร้างและตรวจสอบ JSON Web Token (JWT) ใช้สำหรับ authentication และ authorization

- **parseUserAgent.js**
  - ฟังก์ชันสำหรับแยกข้อมูล user agent string (browser, OS, device) จาก request header เพื่อวิเคราะห์หรือบันทึกข้อมูลอุปกรณ์ของผู้ใช้
