# คำอธิบายไฟล์ในโฟลเดอร์ seed

- **seed.js** — ผู้ใช้, สินค้า, หมวดหมู่, แบรนด์ (`npm run seed`)
- **seed-shipping-payment.js** — โซนขนส่ง, วิธีชำระเงิน (`npm run seed:shipping`)
- **seed-address-thai.js** — จังหวัด/อำเภอ/ตำบล จาก `csv/` (`npm run seed:address`)
- **clear.js** — ล้างตารางทั้งหมด (`npm run clearSeed`)
- **csv/** — `provinces.csv`, `districts.csv`, `sub_districts.csv` (ต้องอยู่ใน image ตอน build)

## รัน seed ทั้งชุด

**ต้อง migrate ก่อนเสมอ** (สร้างตารางจาก schema):

```bash
# ใน Docker (หลัง rebuild image)
docker compose exec backend npm run migrate      # sync จาก src/models/schema.js
docker compose exec backend npm run seed:all

docker compose exec backend npm run db:setup   # migrate + seed
```

Schema อยู่ที่ `src/models/schema.js` — migrations เก่าถูกลบแล้ว ใช้ `drizzle-kit push` เป็นหลัก

ถ้าเจอ `relation does not exist` → รัน `npm run migrate` ก่อน seed

ลำดับใน `seed:all`: `seed.js` → `seed-shipping-payment.js` → `seed-address-thai.js`

**หมายเหตุ:** ถ้า error ชี้ไป `frontend/public/CSV thailand map` แปลว่า container ยังใช้ image เก่า — รัน `docker compose build --no-cache backend` แล้ว up ใหม่
