/**
 * Demo/reference data used by the seed scripts. The admin "seed preview"
 * reads the same constants, so what it shows is exactly what gets created.
 */

export const DEMO_ADMIN = { name: "Admin User", email: "admin@example.com", password: "admin123" };

export const DEMO_STORE = {
  name: "Main Warehouse & Store",
  description: "Our primary warehouse located in Bangkok",
  address: "123 Rama IX Rd, Huai Khwang",
  city: "Bangkok",
  state: "Bangkok",
  country: "Thailand",
  postalCode: "10310",
  phone: "02-123-4567",
  email: "warehouse@webecommerce.com",
  isActive: true,
};

export const DEMO_CATEGORIES = [
  { key: "clothing", name: "Clothing", description: "All types of clothing items" },
  { key: "accessories", name: "Accessories", description: "Fashion accessories" },
  { key: "electronics", name: "Electronics", description: "Electronic devices and gadgets" },
];

export const DEMO_BRANDS = [
  { key: "fashion", name: "Fashion Brand", description: "Trendy fashion items", website: "https://fashionbrand.com" },
  { key: "luxury", name: "Luxury Brand", description: "High-end luxury items", website: "https://luxurybrand.com" },
  { key: "tech", name: "Tech Brand", description: "Latest technology", website: "https://techbrand.com" },
];

export const DEMO_PRODUCTS = [
  {
    key: "tshirt",
    name: "Classic T-Shirt",
    description: "Comfortable cotton t-shirt",
    price: 29.99,
    category: "clothing",
    brand: "fashion",
    variants: [
      { color: "Black", size: "M", sku: "TS-BLK-M-001", stock: 30, price: 29.99 },
      { color: "White", size: "L", sku: "TS-WHT-L-001", stock: 25, price: 29.99 },
    ],
  },
  {
    key: "watch",
    name: "Designer Watch",
    description: "Luxury timepiece",
    price: 299.99,
    category: "accessories",
    brand: "luxury",
    variants: [{ color: "Silver", size: "One Size", sku: "WT-SLV-001", stock: 15, price: 299.99 }],
  },
  {
    key: "phone",
    name: "Smartphone",
    description: "Latest smartphone model",
    price: 999.99,
    category: "electronics",
    brand: "tech",
    variants: [{ color: "Space Gray", size: "128GB", sku: "PH-SGR-128", stock: 10, price: 999.99 }],
  },
];

export const DEMO_SUPPLIER = {
  name: "Global Apparel Supply Co.",
  contactPerson: "John Doe",
  email: "john@apparelsupply.com",
  phone: "+66812345678",
  address: { street: "456 Sukhumvit Rd", city: "Bangkok", country: "Thailand" },
  taxId: "1234567890123",
  paymentTerms: "Net 30",
  status: "active",
  products: [{ product: "tshirt", sku: "SUP-TS-001", cost: 15.0, leadTime: 7, minimumOrder: 100 }],
};

export const COUPON_VALID_DAYS = 30;
export const DEMO_COUPONS = [
  { code: "WELCOME10", type: "percentage", value: 10.0, minPurchase: 100.0, maxDiscount: 50.0 },
  { code: "DISCOUNT50", type: "fixed_amount", value: 50.0, minPurchase: 500.0 },
];

export const DISCOUNT_VALID_DAYS = 15;
export const DEMO_DISCOUNT = {
  name: "Summer Sale 15%",
  description: "15% off selected products for summer",
  discountType: "percentage",
  value: 15.0,
  products: ["tshirt"],
};

export const SHIPPING_ZONES = [
  {
    name: "Central",
    description: "กรุงเทพฯ ปริมณฑล ภาคกลาง",
    baseCost: 50.0,
    methods: [
      { name: "Standard Delivery (Central)", code: "STANDARD_CENTRAL", description: "Delivers in 3-5 business days", price: 50.0 },
      { name: "Express Delivery (Central)", code: "EXPRESS_CENTRAL", description: "Next-day delivery", price: 100.0 },
    ],
  },
  { name: "North", description: "ภาคเหนือ", baseCost: 70.0, methods: [{ name: "Standard Delivery (North)", code: "STANDARD_NORTH", description: "Delivers in 3-7 business days", price: 70.0 }] },
  { name: "Northeast", description: "ภาคตะวันออกเฉียงเหนือ", baseCost: 75.0, methods: [{ name: "Standard Delivery (Northeast)", code: "STANDARD_NORTHEAST", description: "Delivers in 3-7 business days", price: 75.0 }] },
  { name: "East", description: "ภาคตะวันออก", baseCost: 65.0, methods: [{ name: "Standard Delivery (East)", code: "STANDARD_EAST", description: "Delivers in 3-7 business days", price: 65.0 }] },
  { name: "West", description: "ภาคตะวันตก", baseCost: 60.0, methods: [{ name: "Standard Delivery (West)", code: "STANDARD_WEST", description: "Delivers in 3-7 business days", price: 60.0 }] },
  { name: "South", description: "ภาคใต้", baseCost: 80.0, methods: [{ name: "Standard Delivery (South)", code: "STANDARD_SOUTH", description: "Delivers in 3-7 business days", price: 80.0 }] },
];

export const PAYMENT_METHODS = [
  { name: "Credit Card", code: "CARD", description: "Pay with Visa, Mastercard or JCB (Omise)", settings: { provider: "Omise" } },
  { name: "PromptPay", code: "PROMPTPAY", description: "Pay using PromptPay QR Code", settings: { qrTemplate: "default" } },
];
