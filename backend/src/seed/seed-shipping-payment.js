import { db } from "../config/db.js";
import {
  shippingMethods,
  paymentMethods,
  shippingZones,
} from "../models/schema.js";

async function seedShippingAndPayment() {
  try {
    console.log("Clearing existing shipping and payment methods...");
    await db.delete(shippingMethods);
    await db.delete(paymentMethods);
    await db.delete(shippingZones);
    console.log("Cleared!");

    // Seed shipping zones
    console.log("Seeding shipping zones...");
    const [
      zoneCentral,
      zoneNorth,
      zoneNortheast,
      zoneEast,
      zoneWest,
      zoneSouth,
    ] = await db
      .insert(shippingZones)
      .values([
        {
          name: "Central",
          description: "กรุงเทพฯ ปริมณฑล ภาคกลาง",
          baseCost: 50.0,
          isActive: true,
        },
        {
          name: "North",
          description: "ภาคเหนือ",
          baseCost: 70.0,
          isActive: true,
        },
        {
          name: "Northeast",
          description: "ภาคตะวันออกเฉียงเหนือ",
          baseCost: 75.0,
          isActive: true,
        },
        {
          name: "East",
          description: "ภาคตะวันออก",
          baseCost: 65.0,
          isActive: true,
        },
        {
          name: "West",
          description: "ภาคตะวันตก",
          baseCost: 60.0,
          isActive: true,
        },
        {
          name: "South",
          description: "ภาคใต้",
          baseCost: 80.0,
          isActive: true,
        },
      ])
      .onConflictDoNothing()
      .returning();
    console.log("Shipping zones seeded!");

    // Seed shipping methods (map to zone)
    await db
      .insert(shippingMethods)
      .values([
        // Central
        {
          name: "Standard Delivery (Central)",
          code: "STANDARD_CENTRAL",
          description: "Delivers in 3-5 business days",
          price: 50.0,
          isActive: true,
          shippingZoneId: zoneCentral.id,
        },
        {
          name: "Express Delivery (Central)",
          code: "EXPRESS_CENTRAL",
          description: "Next-day delivery",
          price: 100.0,
          isActive: true,
          shippingZoneId: zoneCentral.id,
        },
        // North
        {
          name: "Standard Delivery (North)",
          code: "STANDARD_NORTH",
          description: "Delivers in 3-7 business days",
          price: 70.0,
          isActive: true,
          shippingZoneId: zoneNorth.id,
        },
        // Northeast
        {
          name: "Standard Delivery (Northeast)",
          code: "STANDARD_NORTHEAST",
          description: "Delivers in 3-7 business days",
          price: 75.0,
          isActive: true,
          shippingZoneId: zoneNortheast.id,
        },
        // East
        {
          name: "Standard Delivery (East)",
          code: "STANDARD_EAST",
          description: "Delivers in 3-7 business days",
          price: 65.0,
          isActive: true,
          shippingZoneId: zoneEast.id,
        },
        // West
        {
          name: "Standard Delivery (West)",
          code: "STANDARD_WEST",
          description: "Delivers in 3-7 business days",
          price: 60.0,
          isActive: true,
          shippingZoneId: zoneWest.id,
        },
        // South
        {
          name: "Standard Delivery (South)",
          code: "STANDARD_SOUTH",
          description: "Delivers in 3-7 business days",
          price: 80.0,
          isActive: true,
          shippingZoneId: zoneSouth.id,
        },
      ])
      .onConflictDoNothing();
    console.log("Shipping methods seeded!");

    console.log("Seeding payment methods...");
    await db.insert(paymentMethods).values([
      {
        name: "Credit Card",
        code: "CARD",
        description: "Pay with Visa, Mastercard or JCB (Omise)",
        isActive: true,
        settings: { provider: "Omise" },
      },
      {
        name: "PromptPay",
        code: "PROMPTPAY",
        description: "Pay using PromptPay QR Code",
        isActive: true,
        settings: { qrTemplate: "default" },
      },
    ]);
    console.log("Payment methods seeded!");
  } catch (error) {
    console.error("Error seeding shipping/payment methods:", error);
    throw error;
  }
}

seedShippingAndPayment()
  .then(() => {
    console.log("Seeding shipping/payment methods completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
