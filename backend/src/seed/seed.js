// seed.js
import { db } from "../config/db.js";
import {
  brands,
  userRoles,
  categories,
  productVariants as product_variants,
  products,
  users,
} from "../models/schema.js";
import { hashPassword } from "../utils/hashPassword.js";

async function seed() {
  try {
    console.log("Clearing existing data...");
    await db.delete(product_variants);
    await db.delete(products);
    await db.delete(categories);
    await db.delete(brands);
    await db.delete(userRoles);
    await db.delete(users);
    console.log("Existing data cleared!");

    const adminPasswordHash = await hashPassword("admin123");

    // Insert Users (login: admin@example.com / admin123)
    const [adminUser] = await db
      .insert(users)
      .values([
        {
          name: "Admin User",
          email: "admin@example.com",
          password: adminPasswordHash,
          isVerified: true,
          isActive: true,
        },
      ])
      .returning();

    // Assign Admin Role
    await db.insert(userRoles).values([{ userId: adminUser.id, role: "admin" }]);

    // Insert Categories
    const [clothingCategory, accessoriesCategory, electronicsCategory] =
      await db
        .insert(categories)
        .values([
          { name: "Clothing", description: "All types of clothing items" },
          { name: "Accessories", description: "Fashion accessories" },
          {
            name: "Electronics",
            description: "Electronic devices and gadgets",
          },
        ])
        .returning();

    // Insert Brands
    const [brand1, brand2, brand3] = await db
      .insert(brands)
      .values([
        {
          name: "Fashion Brand",
          description: "Trendy fashion items",
          logo: null,
          website: "https://fashionbrand.com",
          isActive: true,
        },
        {
          name: "Luxury Brand",
          description: "High-end luxury items",
          logo: null,
          website: "https://luxurybrand.com",
          isActive: true,
        },
        {
          name: "Tech Brand",
          description: "Latest technology",
          logo: null,
          website: "https://techbrand.com",
          isActive: true,
        },
      ])
      .returning();

    // Insert Products
    const [product1, product2, product3] = await db
      .insert(products)
      .values([
        {
          name: "Classic T-Shirt",
          description: "Comfortable cotton t-shirt",
          price: 29.99,
          imageUrl: [],
          categoryId: clothingCategory.id,
          brandId: brand1.id,
        },
        {
          name: "Designer Watch",
          description: "Luxury timepiece",
          price: 299.99,
          imageUrl: [],
          categoryId: accessoriesCategory.id,
          brandId: brand2.id,
        },
        {
          name: "Smartphone",
          description: "Latest smartphone model",
          price: 999.99,
          imageUrl: [],
          categoryId: electronicsCategory.id,
          brandId: brand3.id,
        },
      ])
      .returning();

    // Insert Product Variants
    await db.insert(product_variants).values([
      {
        productId: product1.id,
        color: "Black",
        size: "M",
        sku: "TS-BLK-M-001",
        stock: 30,
        price: 29.99,
      },
      {
        productId: product1.id,
        color: "White",
        size: "L",
        sku: "TS-WHT-L-001",
        stock: 25,
        price: 29.99,
      },
      {
        productId: product2.id,
        color: "Silver",
        size: "One Size",
        sku: "WT-SLV-001",
        stock: 15,
        price: 299.99,
      },
      {
        productId: product3.id,
        color: "Space Gray",
        size: "128GB",
        sku: "PH-SGR-128",
        stock: 10,
        price: 999.99,
      },
    ]);

    console.log("Seed data inserted successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log("Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
