import swaggerJSDoc from "swagger-jsdoc";
import { buildPaths } from "../docs/index.js";
import { readFileSync } from "fs";
import { resolve } from "path";

let version = "1.0.0";
try {
  const pkgPath = resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  if (pkg.version) version = pkg.version;
} catch {
  /* fallback to 1.0.0 */
}

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WebEcommerce API Documentation",
      version,
      description:
        "เอกสาร API และเครื่องมือทดสอบระบบ WebEcommerce (Express 5 + Drizzle ORM + PostgreSQL + Redis + MinIO)\n\n" +
        "### การใช้งาน Authentication:\n" +
        "1. กดปุ่ม **Authorize** ด้านขวาบน\n" +
        "2. นำ JWT Token ที่ได้จากการเรียก `/api/auth/login` หรือ `/api/auth/register` มาใส่ในช่อง Value (ในรูปแบบ `eyJhbGci...` หรือ `Bearer <token>`)\n" +
        "3. สามารถทดสอบทุก Endpoint ที่ต้องใช้สิทธิ์เข้าถึงได้ทันที",
      contact: {
        name: "WebEcommerce Support Team",
        email: "support@webecommerce.local",
      },
    },
    servers: [
      {
        url: "/",
        description: "Current host",
      },
      {
        url: "http://localhost:5000",
        description: "Development Server",
      },
      {
        url: "http://localhost:8080",
        description: "Docker / Staging Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "ใส่ JWT Access Token เพื่อระบุตัวตนในการเรียกใช้งาน API",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description: "httpOnly cookie set by /api/auth/login (browsers send it automatically)",
        },
      },
      schemas: {
        StandardResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string", example: "ดำเนินการสำเร็จ" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            status: { type: "string", example: "error" },
            message: { type: "string", example: "ข้อมูลไม่ถูกต้อง" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "email" },
                  message: { type: "string", example: "รูปแบบอีเมลไม่ถูกต้อง" },
                },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            total: { type: "integer", example: 45 },
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            pages: { type: "integer", example: 5 },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", example: "a3b1c2d3-e4f5-6789-0123-456789abcdef" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            role: { type: "string", enum: ["admin", "staff", "user"], example: "user" },
            isActive: { type: "boolean", example: true },
            isVerified: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", example: "b4c2d3e4-f5a6-7890-1234-567890abcdef" },
            name: { type: "string", example: "เสื้อยืดคอตตอน 100%" },
            description: { type: "string", example: "เสื้อยืดผ้านุ่ม ใส่สบาย ระบายอากาศได้ดี" },
            price: { type: "number", example: 350.0 },
            imageUrl: {
              type: "array",
              items: { type: "string" },
              example: ["http://localhost:9000/products/tshirt-white.jpg"],
            },
            categoryId: { type: "string", format: "uuid" },
            brandId: { type: "string", format: "uuid" },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ProductVariant: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            color: { type: "string", example: "White" },
            size: { type: "string", example: "M" },
            sku: { type: "string", example: "TSHIRT-WHT-M-001" },
            stock: { type: "integer", example: 50 },
            price: { type: "number", example: 350.0 },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "เสื้อผ้าแฟชั่นชาย" },
            description: { type: "string", example: "เสื้อผ้า เครื่องแต่งกายสำหรับผู้ชาย" },
          },
        },
        Brand: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Nike" },
            description: { type: "string", example: "แบรนด์อุปกรณ์กีฬาชั้นนำ" },
            logo: { type: "string", example: "http://localhost:9000/brands/nike.png" },
            isActive: { type: "boolean", example: true },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            orderNumber: { type: "string", example: "ORD-20260909-0001" },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
              example: "pending",
            },
            paymentStatus: { type: "string", example: "pending" },
            shippingStatus: { type: "string", example: "pending" },
            total: { type: "number", example: 750.0 },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Coupon: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            code: { type: "string", example: "SUMMER10" },
            type: { type: "string", enum: ["percentage", "fixed_amount"], example: "percentage" },
            value: { type: "number", example: 10 },
            minPurchase: { type: "number", example: 500 },
            maxDiscount: { type: "number", example: 200 },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            isActive: { type: "boolean", example: true },
          },
        },
        ShippingMethod: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Kerry Express" },
            code: { type: "string", example: "KERRY" },
            price: { type: "number", example: 50.0 },
            isActive: { type: "boolean", example: true },
          },
        },
        PaymentTransaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            orderId: { type: "string", format: "uuid" },
            amount: { type: "number", example: 750.0 },
            status: { type: "string", enum: ["pending", "completed", "failed", "refunded"], example: "completed" },
            transactionId: { type: "string", example: "chrg_test_5xyz" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "คำสั่งซื้อของคุณได้รับการยืนยันแล้ว" },
            message: { type: "string", example: "คำสั่งซื้อ #ORD-20260909-0001 กำลังจัดเตรียมสินค้า" },
            type: { type: "string", example: "order_status" },
            isRead: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Settings: {
          type: "object",
          properties: {
            siteName: { type: "string", example: "My Shop" },
            maintenance: { type: "boolean", example: false },
            theme: { type: "string", example: "light" },
            currency: { type: "string", example: "THB" },
          },
        },
      },
    },
    paths: {
      "/api/products": {
        get: {
          tags: ["Products"],
          summary: "ดึงรายการสินค้า (พร้อม Pagination & Search & Filter)",
          parameters: [
            { in: "query", name: "page", schema: { type: "integer", default: 1 }, description: "หน้าปัจจุบัน" },
            { in: "query", name: "limit", schema: { type: "integer", default: 10 }, description: "จำนวนต่อหน้า" },
            { in: "query", name: "search", schema: { type: "string" }, description: "ค้นหาชื่อ/รายละเอียด" },
            { in: "query", name: "category", schema: { type: "string" }, description: "กรองตาม categoryId" },
            { in: "query", name: "minPrice", schema: { type: "number" } },
            { in: "query", name: "maxPrice", schema: { type: "number" } },
          ],
          responses: {
            200: { description: "รายการสินค้าพร้อมข้อมูล pagination" },
          },
        },
        post: {
          tags: ["Products"],
          summary: "สร้างสินค้าใหม่ (Admin เท่านั้น)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "description", "price", "categoryId"],
                  properties: {
                    name: { type: "string", example: "เสื้อเชิ้ตลายแขนยาว" },
                    description: { type: "string", example: "ผ้านุ่มสบาย ใส่เที่ยวใส่ทำงานได้" },
                    price: { type: "number", example: 490.0 },
                    categoryId: { type: "string", format: "uuid" },
                    brandId: { type: "string", format: "uuid" },
                    imageUrl: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "สร้างสินค้าสำเร็จ" },
            409: { description: "SKU ซ้ำกับในระบบ" },
          },
        },
      },
      "/api/products/{id}": {
        get: {
          tags: ["Products"],
          summary: "ดึงรายละเอียดสินค้าตาม ID",
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "ข้อมูลสินค้า" }, 404: { description: "ไม่พบสินค้า" } },
        },
        patch: {
          tags: ["Products"],
          summary: "แก้ไขสินค้าแบบ Partial Update (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    isActive: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "อัปเดตสินค้าสำเร็จ" } },
        },
        delete: {
          tags: ["Products"],
          summary: "Soft Delete สินค้า (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "ปิดการใช้งานสินค้าสำเร็จ" } },
        },
      },
      "/api/categories": {
        get: {
          tags: ["Categories"],
          summary: "ดึงรายการหมวดหมู่สินค้าทั้งหมด",
          responses: { 200: { description: "รายการหมวดหมู่" } },
        },
        post: {
          tags: ["Categories"],
          summary: "สร้างหมวดหมู่ใหม่ (Admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", example: "รองเท้าผ้าใบ" },
                    description: { type: "string", example: "หมวดหมู่รองเท้าสปอร์ตและแฟชั่น" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "สร้างหมวดหมู่สำเร็จ" }, 409: { description: "มีหมวดหมู่นี้อยู่แล้ว" } },
        },
      },
      "/api/categories/{id}": {
        delete: {
          tags: ["Categories"],
          summary: "ลบหมวดหมู่สินค้า (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "ลบหมวดหมู่สำเร็จ" },
            400: { description: "ไม่สามารถลบหมวดหมู่ได้เนื่องจากมีสินค้าผูกอยู่" },
          },
        },
      },
      "/api/brands": {
        get: {
          tags: ["Brands"],
          summary: "ดึงรายการแบรนด์ทั้งหมด",
          responses: { 200: { description: "รายการแบรนด์" } },
        },
        post: {
          tags: ["Brands"],
          summary: "สร้างแบรนด์ใหม่ (Admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", example: "Adidas" },
                    description: { type: "string", example: "แบรนด์เสื้อผ้าและรองเท้าชั้นนำ" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "สร้างแบรนด์สำเร็จ" } },
        },
      },
      "/api/brands/{id}": {
        delete: {
          tags: ["Brands"],
          summary: "Soft Delete แบรนด์ (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "ปิดใช้งานแบรนด์สำเร็จ" },
            400: { description: "ไม่สามารถลบได้เนื่องจากมีสินค้าผูกอยู่" },
          },
        },
      },
      "/api/orders/checkout": {
        post: {
          tags: ["Orders"],
          summary: "สร้างคำสั่งซื้อใหม่ (Checkout)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["shippingAddressId", "billingAddressId", "shippingMethodId", "paymentMethodId", "items"],
                  properties: {
                    shippingAddressId: { type: "string", format: "uuid" },
                    billingAddressId: { type: "string", format: "uuid" },
                    shippingMethodId: { type: "string", format: "uuid" },
                    paymentMethodId: { type: "string", format: "uuid" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["productId", "quantity"],
                        properties: {
                          productId: { type: "string", format: "uuid" },
                          variantId: { type: "string", format: "uuid" },
                          quantity: { type: "integer", example: 1 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "สร้างออเดอร์สำเร็จ" } },
        },
      },
      "/api/orders/admin/all": {
        get: {
          tags: ["Orders"],
          summary: "ดึงรายการออเดอร์ทั้งหมด (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "page", schema: { type: "integer", default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", default: 10 } },
            { in: "query", name: "status", schema: { type: "string" } },
          ],
          responses: { 200: { description: "รายการคำสั่งซื้อ" } },
        },
      },
      "/api/orders/admin/{orderId}/status": {
        patch: {
          tags: ["Orders"],
          summary: "เปลี่ยนสถานะคำสั่งซื้อด้วย State Machine (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "orderId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: { type: "string", example: "confirmed" },
                    notes: { type: "string", example: "การชำระเงินได้รับการยืนยันแล้ว" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "เปลี่ยนสถานะสำเร็จ" },
            400: { description: "ลำดับการเปลี่ยนสถานะไม่ถูกต้องตาม State Machine" },
          },
        },
      },
      "/api/orders/{orderId}": {
        delete: {
          tags: ["Orders"],
          summary: "พยายามลบคำสั่งซื้อ (จะถูกปฏิเสธ 400 Bad Request)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "orderId", required: true, schema: { type: "string" } }],
          responses: { 400: { description: "ไม่สามารถลบข้อมูลคำสั่งซื้อได้ โปรดใช้การยกเลิกหรือคืนเงินแทน" } },
        },
      },
      "/api/coupons": {
        get: {
          tags: ["Coupons"],
          summary: "ดึงรายการคูปองส่วนลดทั้งหมด (Admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "รายการคูปอง" } },
        },
        post: {
          tags: ["Coupons"],
          summary: "สร้างคูปองส่วนลดใหม่ (Admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["code", "type", "value", "startDate", "endDate"],
                  properties: {
                    code: { type: "string", example: "DISCOUNT20" },
                    type: { type: "string", enum: ["percentage", "fixed"], example: "percentage" },
                    value: { type: "number", example: 20 },
                    minPurchase: { type: "number", example: 500 },
                    maxDiscount: { type: "number", example: 300 },
                    startDate: { type: "string", format: "date-time" },
                    endDate: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "สร้างคูปองสำเร็จ" }, 409: { description: "รหัสคูปองซ้ำ" } },
        },
      },
      "/api/coupons/validate": {
        get: {
          tags: ["Coupons"],
          summary: "ตรวจสอบความถูกต้องของคูปองก่อนใช้",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "code", required: true, schema: { type: "string" } },
            { in: "query", name: "amount", required: true, schema: { type: "number" } },
          ],
          responses: { 200: { description: "คูปองใช้งานได้" }, 400: { description: "คูปองไม่ถูกต้องหรือหมดอายุ" } },
        },
      },
      "/api/payments/admin/transactions": {
        get: {
          tags: ["Payments"],
          summary: "ดึงประวัติการชำระเงินทั้งหมด (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "page", schema: { type: "integer", default: 1 } },
            { in: "query", name: "status", schema: { type: "string" } },
          ],
          responses: { 200: { description: "รายการชำระเงิน" } },
        },
      },
      "/api/payments/{id}/refund": {
        post: {
          tags: ["Payments"],
          summary: "ดำเนินการคืนเงิน Refund (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["reason"],
                  properties: {
                    amount: { type: "number", example: 750.0 },
                    reason: { type: "string", example: "สินค้าหมดสต็อก" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "การคืนเงินสำเร็จ" } },
        },
      },
      "/api/payments/{id}": {
        delete: {
          tags: ["Payments"],
          summary: "พยายามลบรายการชำระเงิน (จะถูกปฏิเสธ 400 Bad Request)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 400: { description: "ไม่สามารถลบธุรกรรมการชำระเงินได้ โปรดใช้ Refund แทน" } },
        },
      },
      "/api/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "ดึงรายการการแจ้งเตือนของผู้ใช้",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "รายการการแจ้งเตือน" } },
        },
        post: {
          tags: ["Notifications"],
          summary: "สร้างและส่งบอร์ดแคสต์การแจ้งเตือน (Admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "message", "type"],
                  properties: {
                    title: { type: "string", example: "โปรโมชันประจำเดือน" },
                    message: { type: "string", example: "ลดราคาพิเศษสินค้าทุกหมวดหมู่ 20%" },
                    type: { type: "string", example: "promotion" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "สร้างการแจ้งเตือนสำเร็จ" } },
        },
      },
      "/api/reports/sales": {
        get: {
          tags: ["Reports"],
          summary: "ดึงรายงานยอดขาย (พร้อม Redis Cache)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "startDate", schema: { type: "string", format: "date" } },
            { in: "query", name: "endDate", schema: { type: "string", format: "date" } },
            { in: "query", name: "groupBy", schema: { type: "string", enum: ["daily", "monthly", "product", "category"] } },
          ],
          responses: { 200: { description: "ข้อมูลสถิติรายงานยอดขาย" } },
        },
      },
      "/api/settings": {
        get: {
          tags: ["Settings"],
          summary: "ดึงค่าการตั้งค่าระบบ (Admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "การตั้งค่าระบบ" } },
        },
        put: {
          tags: ["Settings"],
          summary: "อัปเดตการตั้งค่าระบบ (Admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    siteName: { type: "string", example: "My E-Commerce Store" },
                    maintenance: { type: "boolean", example: false },
                    theme: { type: "string", enum: ["light", "dark"], example: "light" },
                    currency: { type: "string", example: "THB" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "บันทึกการตั้งค่าสำเร็จ" } },
        },
      },
      "/api/settings/public": {
        get: {
          tags: ["Settings"],
          summary: "ดึงค่าการตั้งค่าระบบสำหรับหน้าเว็บสาธารณะ",
          responses: { 200: { description: "ค่าการตั้งค่าสาธารณะ" } },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);

// Routes documented from their zod DTOs (src/docs) take precedence over the
// hand-written entries above, which are migrated module by module.
for (const [path, operations] of Object.entries(buildPaths())) {
  swaggerSpec.paths[path] = { ...swaggerSpec.paths[path], ...operations };
}
