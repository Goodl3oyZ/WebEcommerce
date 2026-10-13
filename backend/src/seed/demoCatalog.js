/**
 * Demo catalogue for showing the storefront: real photos (src/seed/demo-images,
 * see CREDITS.md), Thai descriptions and realistic prices/stock. Installing it
 * adds to the shop without deleting anything, and everything it creates is
 * recorded in seed_records so "remove demo data" takes exactly that back out.
 * SKUs start with DEMO- so demo products are recognisable anywhere.
 */

export const DEMO_IMAGE_PREFIX = "demo/";

export const DEMO_CATALOG_CATEGORIES = [
  { key: "apparel", name: "เสื้อผ้าออกกำลังกาย", description: "เสื้อ ฮู้ดดี้ เลกกิ้ง และสปอร์ตบรา สำหรับเทรนทุกวัน" },
  { key: "footwear", name: "รองเท้า", description: "รองเท้าวิ่งและรองเท้าเทรนนิ่ง" },
  { key: "equipment", name: "อุปกรณ์ฟิตเนส", description: "ดัมเบล เคตเทิลเบล และอุปกรณ์สำหรับโฮมยิม" },
  { key: "accessories", name: "แอคเซสซอรี่", description: "ขวดน้ำ หมวก และของใช้ติดกระเป๋ายิม" },
  { key: "wearables", name: "อุปกรณ์สวมใส่อัจฉริยะ", description: "สมาร์ทวอทช์ สมาร์ทริง และสายรัดข้อมือวัดกิจกรรม" },
  { key: "recovery", name: "ฟื้นฟูร่างกาย", description: "เครื่องนวดและอุปกรณ์ช่วยฟื้นตัวหลังซ้อม" },
];

export const DEMO_CATALOG_BRANDS = [
  { key: "northform", name: "Northform", description: "เสื้อผ้าเทรนนิ่งเรียบง่าย ใส่ได้ทุกวัน" },
  { key: "ironworks", name: "Ironworks", description: "อุปกรณ์เหล็กสำหรับยิมและโฮมยิม" },
  { key: "stridelab", name: "Stride Lab", description: "รองเท้าและของใช้สำหรับนักวิ่ง" },
  { key: "pulselabs", name: "Pulse Labs", description: "อุปกรณ์สวมใส่และเทคโนโลยีเพื่อการฟื้นตัว" },
];

const sizes = (prefix, color, list, stock, price) =>
  list.map((size, i) => ({ color, size, sku: `${prefix}-${color.toUpperCase().replace(/\s+/g, "")}-${size}`, stock: stock[i] ?? stock.at(-1), price }));

// Specs (attributes) are sample merchandising data for the demo brands. They
// describe tracking features only; none of these are medical devices.
export const DEMO_CATALOG_PRODUCTS = [
  {
    name: "Pulse One Smartwatch",
    description:
      "สมาร์ทวอทช์สำหรับคนที่ซ้อมจริงจัง วัดอัตราการเต้นของหัวใจด้วยแสง นับก้าว บันทึกการวิ่งด้วย GPS ในตัว และสรุปการนอนทุกเช้า ใช้เพื่อติดตามกิจกรรม ไม่ใช่อุปกรณ์ทางการแพทย์",
    price: 6990,
    category: "wearables",
    brand: "pulselabs",
    images: ["watch-1.jpg", "watch-2.jpg"],
    attributes: {
      หน้าจอ: "AMOLED 1.43 นิ้ว",
      เซนเซอร์: "วัดชีพจรด้วยแสง, ตรวจจับการเคลื่อนไหว 6 แกน",
      ระบุตำแหน่ง: "GPS ในตัว",
      แบตเตอรี่: "สูงสุด 7 วัน (ใช้งานทั่วไป)",
      กันน้ำ: "5 ATM",
      น้ำหนัก: "38 กรัม (ไม่รวมสาย)",
    },
    variants: [
      { color: "Mist", size: "42 mm", sku: "DEMO-WATCH-MIST", stock: 14, price: 6990 },
      { color: "Graphite", size: "42 mm", sku: "DEMO-WATCH-GRAPHITE", stock: 9, price: 6990 },
    ],
  },
  {
    name: "Halo Smart Ring",
    description:
      "สมาร์ทริงไทเทเนียม บาง เบา ใส่นอนได้ทั้งคืน ติดตามระยะการนอน ชีพจรขณะพัก และแนวโน้มอุณหภูมิผิว ข้อมูลใช้เพื่อดูแลตัวเอง ไม่ใช่การวินิจฉัยโรค",
    price: 8990,
    category: "wearables",
    brand: "pulselabs",
    images: ["ring-1.jpg", "ring-2.jpg"],
    attributes: {
      วัสดุ: "ไทเทเนียม เคลือบ PVD",
      เซนเซอร์: "วัดชีพจรด้วยแสง, อุณหภูมิผิว, ตรวจจับการเคลื่อนไหว",
      ติดตาม: "การนอน, ชีพจรขณะพัก, กิจกรรมประจำวัน",
      แบตเตอรี่: "สูงสุด 5 วัน",
      กันน้ำ: "100 เมตร",
      น้ำหนัก: "3-5 กรัม ตามขนาด",
    },
    variants: sizes("DEMO-RING", "Black", ["7", "8", "9", "10", "11", "12"], [3, 6, 8, 8, 5, 2], 8990),
  },
  {
    name: "Pulse Band 2",
    description: "สายรัดข้อมือวัดกิจกรรม จอสี น้ำหนักเบา ใส่ได้ทั้งวันทั้งคืน นับก้าว วัดชีพจร และเตือนให้ลุกเดิน",
    price: 1490,
    category: "wearables",
    brand: "pulselabs",
    images: ["band-1.jpg", "band-2.jpg"],
    attributes: {
      หน้าจอ: "AMOLED 1.1 นิ้ว",
      เซนเซอร์: "วัดชีพจรด้วยแสง, ตรวจจับการเคลื่อนไหว",
      แบตเตอรี่: "สูงสุด 14 วัน",
      กันน้ำ: "5 ATM",
    },
    variants: [{ color: "Black", size: "Free size", sku: "DEMO-BAND-BLACK", stock: 30, price: 1490 }],
  },
  {
    name: "Recover Pro Massage Gun",
    description: "เครื่องนวดกล้ามเนื้อแบบพกพา ปรับได้ 5 ระดับ หัวนวด 4 แบบ เสียงเบา ใช้คลายกล้ามเนื้อหลังซ้อม",
    price: 4990,
    category: "recovery",
    brand: "pulselabs",
    images: ["massager-1.jpg", "massager-2.jpg"],
    attributes: {
      ระดับความแรง: "5 ระดับ",
      หัวนวด: "4 แบบ",
      แบตเตอรี่: "สูงสุด 6 ชั่วโมง",
      น้ำหนัก: "650 กรัม",
    },
    variants: [{ color: "Black", size: "Standard", sku: "DEMO-MASSAGER-BLACK", stock: 12, price: 4990 }],
  },
  {
    name: "Stride Sport Buds",
    description: "หูฟังไร้สายสำหรับวิ่ง ใส่กระชับ กันเหงื่อ มีโหมดฟังเสียงรอบข้างเพื่อความปลอดภัยเวลาวิ่งบนถนน",
    price: 2490,
    category: "accessories",
    brand: "stridelab",
    images: ["buds-1.jpg", "buds-2.jpg"],
    attributes: {
      กันน้ำกันเหงื่อ: "IPX5",
      แบตเตอรี่: "8 ชั่วโมง (รวมเคส 30 ชั่วโมง)",
      การเชื่อมต่อ: "Bluetooth 5.3",
    },
    variants: [{ color: "Black", size: "Standard", sku: "DEMO-BUDS-BLACK", stock: 20, price: 2490 }],
  },
  {
    name: "Essential Cotton Tee",
    description: "เสื้อยืดคอตตอน 100% ผ้าหนานุ่ม ทรงตรง ใส่เทรนหรือใส่เที่ยวก็ได้ ซักแล้วไม่ย้วย",
    price: 390,
    category: "apparel",
    brand: "northform",
    images: ["tee-black-1.jpg", "tee-black-2.jpg", "tee-white-1.jpg"],
    variants: [
      ...sizes("DEMO-TEE", "Black", ["S", "M", "L", "XL"], [12, 30, 24, 8], 390),
      ...sizes("DEMO-TEE", "White", ["S", "M", "L", "XL"], [10, 20, 18, 0], 390),
    ],
  },
  {
    name: "Long Sleeve Training Top",
    description: "เสื้อแขนยาวผ้าบางเบา ระบายอากาศดี เหมาะกับคาร์ดิโอช่วงเช้าและวิ่งกลางแจ้ง",
    price: 590,
    category: "apparel",
    brand: "northform",
    images: ["longsleeve-1.jpg"],
    variants: sizes("DEMO-LST", "Black", ["S", "M", "L", "XL"], [6, 14, 12, 4], 590),
  },
  {
    name: "Heavyweight Hoodie",
    description: "ฮู้ดดี้ผ้าสำลีหนา 400 gsm อุ่นแต่ไม่อับ มีกระเป๋าหน้าท้อง ใส่วอร์มอัพหรือใส่ทับหลังเทรน",
    price: 1290,
    category: "apparel",
    brand: "northform",
    images: ["hoodie-white-1.jpg", "hoodie-grey-1.jpg"],
    variants: [
      ...sizes("DEMO-HOOD", "White", ["M", "L", "XL"], [8, 10, 5], 1290),
      ...sizes("DEMO-HOOD", "Grey", ["M", "L", "XL"], [9, 12, 3], 1290),
    ],
  },
  {
    name: "Sculpt High-Rise Leggings",
    description: "เลกกิ้งเอวสูง ผ้ายืด 4 ทิศ กระชับแต่ไม่อึดอัด ไม่โป๊เวลาสควอต",
    price: 890,
    category: "apparel",
    brand: "northform",
    images: ["leggings-1.jpg", "leggings-2.jpg"],
    variants: sizes("DEMO-LEG", "Black", ["XS", "S", "M", "L"], [7, 16, 15, 6], 890),
  },
  {
    name: "Support Sports Bra",
    description: "สปอร์ตบราซัพพอร์ตระดับกลาง ฟองน้ำถอดได้ สายไขว้หลังไม่บาดไหล่",
    price: 590,
    category: "apparel",
    brand: "northform",
    images: ["sportsbra-1.jpg"],
    variants: sizes("DEMO-BRA", "Rose", ["S", "M", "L"], [10, 14, 6], 590),
  },
  {
    name: "Stride Daily Trainer",
    description: "รองเท้าเทรนนิ่งพื้นนุ่ม รับแรงกระแทกดี ใส่วิ่งระยะสั้นและเล่นเวทได้มั่นคง",
    price: 2490,
    category: "footwear",
    brand: "stridelab",
    images: ["sneaker-1.jpg", "sneaker-2.jpg"],
    variants: sizes("DEMO-TRN", "White", ["40", "41", "42", "43", "44"], [4, 6, 8, 6, 2], 2490),
  },
  {
    name: "Hex Dumbbell (คู่)",
    description: "ดัมเบลหกเหลี่ยมหุ้มยาง วางแล้วไม่กลิ้ง ด้ามจับโครเมียมมีลายกันลื่น ขายเป็นคู่",
    price: 890,
    category: "equipment",
    brand: "ironworks",
    images: ["dumbbell-1.jpg", "dumbbell-2.jpg"],
    variants: [
      { color: "Black", size: "2.5 kg", sku: "DEMO-DB-2.5", stock: 20, price: 590 },
      { color: "Black", size: "5 kg", sku: "DEMO-DB-5", stock: 15, price: 890 },
      { color: "Black", size: "7.5 kg", sku: "DEMO-DB-7.5", stock: 8, price: 1290 },
      { color: "Black", size: "10 kg", sku: "DEMO-DB-10", stock: 4, price: 1690 },
    ],
  },
  {
    name: "Cast Iron Kettlebell",
    description: "เคตเทิลเบลเหล็กหล่อชิ้นเดียว ด้ามกว้างจับสองมือได้ เหมาะกับสวิงและก็อบเล็ตสควอต",
    price: 990,
    category: "equipment",
    brand: "ironworks",
    images: ["kettlebell-1.jpg", "kettlebell-2.jpg"],
    variants: [
      { color: "Black", size: "8 kg", sku: "DEMO-KB-8", stock: 10, price: 790 },
      { color: "Black", size: "12 kg", sku: "DEMO-KB-12", stock: 8, price: 990 },
      { color: "Black", size: "16 kg", sku: "DEMO-KB-16", stock: 5, price: 1290 },
    ],
  },
  {
    name: "Yoga Mat & Cork Block Set",
    description: "เสื่อโยคะหนา 6 มม. กันลื่นทั้งสองด้าน มาพร้อมบล็อกไม้ก๊อก 2 ชิ้น",
    price: 990,
    category: "equipment",
    brand: "ironworks",
    images: ["yogamat-1.jpg"],
    variants: [{ color: "Sage", size: "183x61 cm", sku: "DEMO-MAT-SAGE", stock: 18, price: 990 }],
  },
  {
    name: "Insulated Steel Bottle 750 ml",
    description: "ขวดน้ำสแตนเลสสองชั้น เก็บความเย็นได้ 24 ชั่วโมง ไม่มีไอน้ำเกาะ ฝาไม่รั่ว",
    price: 450,
    category: "accessories",
    brand: "stridelab",
    images: ["bottle-1.jpg", "bottle-2.jpg"],
    variants: [
      { color: "Sage", size: "750 ml", sku: "DEMO-BTL-SAGE", stock: 25, price: 450 },
      { color: "Coral", size: "750 ml", sku: "DEMO-BTL-CORAL", stock: 12, price: 450 },
      { color: "Lilac", size: "750 ml", sku: "DEMO-BTL-LILAC", stock: 0, price: 450 },
    ],
  },
  {
    name: "Washed Training Cap",
    description: "หมวกแก๊ปผ้าฟอกนุ่ม ปรับขนาดได้ด้านหลัง กันแดดเวลาวิ่งกลางแจ้ง",
    price: 390,
    category: "accessories",
    brand: "stridelab",
    images: ["cap-1.jpg", "cap-2.jpg"],
    variants: [
      { color: "Charcoal", size: "Free size", sku: "DEMO-CAP-CHAR", stock: 20, price: 390 },
      { color: "White", size: "Free size", sku: "DEMO-CAP-WHITE", stock: 14, price: 390 },
    ],
  },
];
