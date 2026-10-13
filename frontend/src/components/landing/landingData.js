/**
 * Copy and art direction for the landing page. Product lists come from the
 * API; these entries only say which category (by name) or search each part of
 * the page shows, so the page keeps working when categories are renamed: a
 * missing category falls back to all products.
 */

export const MODES = [
  {
    id: "track",
    label: "Track",
    th: "วัดผล",
    title: "รู้ว่าร่างกายตอบสนองยังไง",
    text: "สมาร์ทวอทช์และสายรัดข้อมือบันทึกชีพจร ก้าวเดิน และการวิ่งของคุณทุกวัน เพื่อให้เห็นแนวโน้ม ไม่ใช่แค่ตัวเลขวันเดียว",
    category: "อุปกรณ์สวมใส่อัจฉริยะ",
    image: "/landing/measure-wrist.webp",
    alt: "ข้อมือสวมสายรัดวัดกิจกรรมกลางแจ้ง",
    tint: "from-[#C8FF3D]/25",
  },
  {
    id: "train",
    label: "Train",
    th: "ฝึก",
    title: "อุปกรณ์ที่อยู่กับคุณทุกเซ็ต",
    text: "ดัมเบล เคตเทิลเบล และเสื่อ สำหรับยิมที่บ้านหรือเสริมการซ้อมนอกยิม",
    category: "อุปกรณ์ฟิตเนส",
    image: "/landing/train.webp",
    alt: "เคตเทิลเบลเหล็กหล่อวางบนเสื่อโยคะ",
    tint: "from-[#FF7A3D]/25",
  },
  {
    id: "recover",
    label: "Recover",
    th: "ฟื้นตัว",
    title: "ฟื้นตัวให้ไวพอ ๆ กับที่ซ้อม",
    text: "เครื่องนวดกล้ามเนื้อช่วยคลายความตึงหลังซ้อม เพื่อให้กลับมาซ้อมครั้งต่อไปได้สบายขึ้น",
    category: "ฟื้นฟูร่างกาย",
    image: "/landing/recover.webp",
    alt: "เครื่องนวดกล้ามเนื้อแบบพกพาสีดำ",
    tint: "from-[#3DD6FF]/20",
  },
  {
    id: "sleep",
    label: "Sleep",
    th: "นอนหลับ",
    title: "การนอนคือครึ่งหนึ่งของการซ้อม",
    text: "สมาร์ทริงใส่นอนได้ทั้งคืน ช่วยให้เห็นระยะการนอนและชีพจรขณะพัก ว่าคืนไหนร่างกายได้พักจริง",
    search: "Ring",
    image: "/landing/sleep-ring.webp",
    alt: "สมาร์ทริงสีเงินวางบนแท่นใส",
    tint: "from-[#9B8CFF]/25",
  },
  {
    id: "explore",
    label: "Explore",
    th: "ออกไปวิ่ง",
    title: "ทุกเส้นทางคือสนามซ้อม",
    text: "รองเท้าวิ่งพื้นนุ่มและหูฟังกันเหงื่อ สำหรับวันที่อยากออกไปวิ่งข้างนอก",
    category: "รองเท้า",
    image: "/landing/track-run.webp",
    alt: "นักวิ่งหญิงวิ่งริมทะเลสาบยามเช้า",
    tint: "from-[#FFD23D]/20",
  },
];

/** Hotspots on /landing/tech-wrist.webp (percent of the 4:5 image box). */
export const TECH = [
  {
    id: "hr",
    label: "Optical heart rate",
    th: "ชีพจรด้วยแสง",
    x: 46,
    y: 59,
    text: "ไฟ LED และเซนเซอร์รับแสงด้านหลังตัวเรือนอ่านการเปลี่ยนแปลงของการไหลเวียนเลือดใต้ผิว แล้วคำนวณเป็นชีพจร ใช้ดูความหนักของการซ้อมและชีพจรขณะพัก",
  },
  {
    id: "motion",
    label: "Motion + GPS",
    th: "การเคลื่อนไหวและตำแหน่ง",
    x: 58,
    y: 38,
    text: "เซนเซอร์ตรวจจับการเคลื่อนไหวนับก้าวและจังหวะการวิ่ง ส่วน GPS บันทึกระยะทางและเพซ เพื่อเทียบการซ้อมแต่ละครั้งได้",
  },
  {
    id: "sleep",
    label: "Sleep + temperature trends",
    th: "การนอนและอุณหภูมิผิว",
    x: 85,
    y: 42,
    text: "ระหว่างนอน อุปกรณ์ใช้การเคลื่อนไหวและชีพจรประมาณระยะการนอน และดูแนวโน้มอุณหภูมิผิวเทียบกับค่าปกติของคุณเอง",
  },
  {
    id: "recovery",
    label: "Recovery insight",
    th: "ความพร้อมในการซ้อม",
    x: 54,
    y: 24,
    text: "เมื่อชีพจรขณะพักสูงกว่าปกติหรือคืนก่อนนอนน้อย หน้าจอจะช่วยให้เห็นว่าวันนี้ควรซ้อมเบาลง แล้วใช้เครื่องนวดและการนอนช่วยฟื้นตัว",
  },
];

export const LOOP = [
  {
    id: "measure",
    label: "Measure",
    th: "วัด",
    text: "อุปกรณ์สวมใส่เก็บชีพจร ก้าว การวิ่ง และการนอนให้อัตโนมัติ ไม่ต้องจดเอง",
    links: [{ label: "อุปกรณ์สวมใส่", category: "อุปกรณ์สวมใส่อัจฉริยะ" }],
  },
  {
    id: "understand",
    label: "Understand",
    th: "เข้าใจ",
    text: "ดูแนวโน้มหลายสัปดาห์ เช่น ชีพจรขณะพักที่สูงขึ้นหลังนอนน้อย เพื่อรู้ว่าเมื่อไหร่ควรเร่ง เมื่อไหร่ควรพัก",
    links: [{ label: "สมาร์ทริง", search: "Ring" }],
  },
  {
    id: "train",
    label: "Train",
    th: "ฝึก",
    text: "ซ้อมตามแผนด้วยอุปกรณ์ที่เหมาะกับเป้าหมาย ทั้งรองเท้าวิ่ง เวทเทรนนิ่ง และเสื้อผ้าที่ระบายอากาศดี",
    links: [
      { label: "อุปกรณ์ฟิตเนส", category: "อุปกรณ์ฟิตเนส" },
      { label: "รองเท้า", category: "รองเท้า" },
    ],
  },
  {
    id: "recover",
    label: "Recover",
    th: "ฟื้นตัว",
    text: "คลายกล้ามเนื้อ นอนให้พอ แล้วกลับไปวัดผลอีกครั้ง วงจรนี้คือสิ่งที่ทำให้ก้าวหน้าแบบไม่เจ็บตัว",
    links: [{ label: "ฟื้นฟูร่างกาย", category: "ฟื้นฟูร่างกาย" }],
  },
];

/** Product featured in the story section (looked up by name; hidden if missing). */
export const STORY_PRODUCT = "Pulse One Smartwatch";

/** Link for a { category | search } target, given the API's categories. */
export function targetHref(target, categories) {
  if (target.search) return `/products?search=${encodeURIComponent(target.search)}`;
  const category = categories.find((c) => c.name === target.category);
  return category ? `/products?category=${category.id}` : "/products";
}

/** API params for a { category | search } target. */
export function targetParams(target, categories) {
  if (target.search) return { search: target.search };
  const category = categories.find((c) => c.name === target.category);
  return category ? { category: category.id } : {};
}
