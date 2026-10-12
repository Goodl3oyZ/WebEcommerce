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
    // Every path is generated from src/docs (zod DTOs); see buildPaths below.
    paths: {},
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);

// Routes documented from their zod DTOs (src/docs) take precedence over the
// hand-written entries above, which are migrated module by module.
for (const [path, operations] of Object.entries(buildPaths())) {
  swaggerSpec.paths[path] = { ...swaggerSpec.paths[path], ...operations };
}
