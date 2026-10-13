import { db } from "../config/db.js";
import {
  shippingMethods,
  paymentMethods,
  shippingZones,
} from "../models/schema.js";
import { PAYMENT_METHODS, SHIPPING_ZONES } from "./data.js";
import { defaultProvincesFor } from "../utils/provinceZones.js";

async function seedShippingAndPayment() {
  try {
    console.log("Clearing existing shipping and payment methods...");
    await db.delete(shippingMethods);
    await db.delete(paymentMethods);
    await db.delete(shippingZones);
    console.log("Cleared!");

    console.log("Seeding shipping zones...");
    for (const { methods, ...zone } of SHIPPING_ZONES) {
      const [row] = await db
        .insert(shippingZones)
        .values({ ...zone, provinces: defaultProvincesFor(zone.name), isActive: true })
        .returning();
      await db.insert(shippingMethods).values(methods.map((m) => ({ ...m, isActive: true, shippingZoneId: row.id })));
    }
    console.log("Shipping zones and methods seeded!");

    console.log("Seeding payment methods...");
    await db.insert(paymentMethods).values(PAYMENT_METHODS.map((m) => ({ ...m, isActive: true })));
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
