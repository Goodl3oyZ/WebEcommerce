import { db } from "../config/db.js";
import {
  addresses,
  orders,
  shippingMethods,
  shippingZones,
  shipments,
  shippingHistory,
} from "../models/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";

export const shippingService = {
  async calculateShippingCost(addressId, items) {
    // Get address and shipping zone
    const address = await db.query.addresses.findFirst({
      where: eq(addresses.id, addressId),
    });
    if (!address) {
      throw new Error("Address not found");
    }
    const zone = await db.query.shippingZones.findFirst({
      where: eq(shippingZones.id, address.shippingZoneId),
    });
    if (!zone) {
      throw new Error("Shipping zone not found");
    }
    // Calculate total weight
    let totalWeight = 0;
    for (const item of items) {
      // ถ้าไม่มี weight ใน item ให้ถือว่า weight = 1
      totalWeight += (item.weight || 1) * item.quantity;
    }
    // Get available shipping methods for the zone
    const methods = await db.query.shippingMethods.findMany({
      where: and(
        eq(shippingMethods.shippingZoneId, zone.id),
        eq(shippingMethods.isActive, true)
      ),
    });
    // Calculate costs for each method
    const costs = methods.map((method) => {
      let cost = parseFloat(method.price);
      // เพิ่มคำนวณตามน้ำหนักถ้ามี weightRate
      if (method.weightRate) {
        cost += totalWeight * parseFloat(method.weightRate);
      }
      return {
        methodId: method.id,
        methodName: method.name,
        cost,
        estimatedDays: method.estimatedDays || null,
      };
    });
    return costs;
  },

  async getShippingMethods(addressId) {
    if (!addressId) {
      // If no addressId is provided (e.g., from Admin Panel), return all shipping methods
      return db.query.shippingMethods.findMany();
    }

    const address = await db.query.addresses.findFirst({
      where: eq(addresses.id, addressId),
    });

    if (!address) {
      throw new Error("Address not found");
    }

    if (!address.shippingZoneId) {
      // ถ้า address ยังไม่มี shippingZoneId ให้ return [] (หรือจะ return methods ทั้งหมดก็ได้)
      return [];
    }

    const methods = await db.query.shippingMethods.findMany({
      where: and(
        eq(shippingMethods.shippingZoneId, address.shippingZoneId),
        eq(shippingMethods.isActive, true)
      ),
    });

    return methods;
  },

  /**
   * Create shipping label (production-grade): ใช้ txOrDb เพื่อรองรับ transaction isolation
   * @param {string} orderId
   * @param {string} shippingMethodId
   * @param {object} txOrDb - drizzle transaction หรือ db instance
   */
  async createShippingLabel(orderId, shippingMethodId, txOrDb = db) {
    try {
      // Check if order exists (ใช้ txOrDb เพื่อรองรับ transaction)
      const order = await txOrDb.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
      if (!order) {
        console.error("Order not found", orderId);
        throw new Error("Order not found");
      }
      // Validate shipping method
      const method = await txOrDb.query.shippingMethods.findFirst({
        where: eq(shippingMethods.id, shippingMethodId),
      });
      if (!method) {
        console.error("Shipping method not found", shippingMethodId);
        throw new Error("Invalid shipping method");
      }
      // Generate tracking number
      const trackingNumber = `TRK${Date.now()}${Math.random()
        .toString(36)
        .substr(2, 5)}`.toUpperCase();
      // Log before insert
      console.log("[createShippingLabel] Inserting shipment", {
        orderId,
        shippingMethodId,
        trackingNumber,
        carrier: method.name,
        order,
        method,
      });
      // Create shipment record (ใช้ txOrDb)
      const [shipment] = await txOrDb
        .insert(shipments)
        .values({
          orderId,
          trackingNumber,
          status: "pending",
          createdAt: new Date(),
          carrier: method.name, // ensure carrier exists in schema
        })
        .returning();
      // Log after insert
      console.log("[createShippingLabel] Shipment insert result", shipment);
      // Add to shipping history (ใช้ txOrDb)
      await txOrDb.insert(shippingHistory).values({
        orderId: orderId,
        shipmentId: shipment.id,
        status: "pending",
        timestamp: new Date(),
      });
      return {
        trackingNumber,
        labelUrl: `https://shipping-labels.example.com/${trackingNumber}`,
        estimatedDelivery: method.estimatedDays
          ? new Date(Date.now() + method.estimatedDays * 24 * 60 * 60 * 1000)
          : null, // TODO: estimatedDays should be in schema
      };
    } catch (err) {
      // Log error message
      console.error("[createShippingLabel] Error:", err);
      throw err;
    }
  },

  async trackShipment(trackingNumber) {
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.trackingNumber, trackingNumber),
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    const history = await db.query.shippingHistory.findMany({
      where: eq(shippingHistory.shipmentId, shipment.id),
      orderBy: [desc(shippingHistory.timestamp)],
    });

    return {
      trackingNumber,
      status: shipment.status,
      history,
    };
  },

  async updateShipmentStatus(trackingNumber, status, location) {
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.trackingNumber, trackingNumber),
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    // Validate status
    const validStatuses = [
      "pending",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed",
    ];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid shipment status");
    }

    // Update shipment status
    const [updatedShipment] = await db
      .update(shipments)
      .set({
        status,
        location,
        updatedAt: new Date(),
      })
      .where(eq(shipments.trackingNumber, trackingNumber))
      .returning();

    // Add to shipping history
    await db.insert(shippingHistory).values({
      shipmentId: shipment.id,
      status,
      location,
      timestamp: new Date(),
    });

    return updatedShipment;
  },

  async getShippingHistory(orderId) {
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.orderId, orderId),
    });

    if (!shipment) {
      throw new Error("Order not found");
    }

    const history = await db.query.shippingHistory.findMany({
      where: eq(shippingHistory.shipmentId, shipment.id),
      orderBy: [desc(shippingHistory.timestamp)],
    });

    return history;
  },

  async validateAddress(address) {
    // Implement address validation logic
    // This could involve calling an external API or using a validation service
    const validation = {
      isValid: true,
      message: "Address is valid",
      suggestions: [],
    };

    // Add validation rules
    if (
      !address.street ||
      !address.city ||
      !address.state ||
      !address.postalCode
    ) {
      validation.isValid = false;
      validation.message = "Missing required address fields";
    }

    // Add more validation rules as needed

    return validation;
  },

  async getShippingZones() {
    const zones = await db.query.shippingZones.findMany();
    return zones;
  },

  async createShippingMethod(data) {
    const code = String(data.code || "").trim().toUpperCase();
    const existing = await db.query.shippingMethods.findFirst({
      where: eq(shippingMethods.code, code),
    });
    if (existing) {
      throw ApiError.conflict("รหัสวิธีการจัดส่งนี้ถูกใช้แล้ว");
    }
    const [method] = await db
      .insert(shippingMethods)
      .values({
        name: String(data.name).trim(),
        code,
        description: data.description || null,
        price: String(data.price),
        isActive: data.isActive ?? true,
        shippingZoneId: data.shippingZoneId || null,
      })
      .returning();
    return method;
  },

  async updateShippingMethod(id, data) {
    const payload = { updatedAt: new Date() };
    if (data.name != null) payload.name = String(data.name).trim();
    if (data.code != null) payload.code = String(data.code).trim().toUpperCase();
    if (data.description !== undefined) payload.description = data.description;
    if (data.price != null) payload.price = String(data.price);
    if (data.isActive != null) payload.isActive = data.isActive;
    if (data.shippingZoneId !== undefined) {
      payload.shippingZoneId = data.shippingZoneId;
    }
    const [method] = await db
      .update(shippingMethods)
      .set(payload)
      .where(eq(shippingMethods.id, id))
      .returning();
    if (!method) throw ApiError.notFound("ไม่พบวิธีการจัดส่ง");
    return method;
  },

  async deleteShippingMethod(id) {
    const [method] = await db
      .update(shippingMethods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shippingMethods.id, id))
      .returning();
    if (!method) throw ApiError.notFound("ไม่พบวิธีการจัดส่ง");
    return method;
  },

  async createShippingZone(data) {
    const [zone] = await db
      .insert(shippingZones)
      .values({
        name: String(data.name).trim(),
        description: data.description || null,
        baseCost: String(data.baseCost),
        isActive: data.isActive ?? true,
      })
      .returning();
    return zone;
  },

  async updateShippingZone(id, data) {
    const payload = { updatedAt: new Date() };
    if (data.name != null) payload.name = String(data.name).trim();
    if (data.description !== undefined) payload.description = data.description;
    if (data.baseCost != null) payload.baseCost = String(data.baseCost);
    if (data.isActive != null) payload.isActive = data.isActive;
    const [zone] = await db
      .update(shippingZones)
      .set(payload)
      .where(eq(shippingZones.id, id))
      .returning();
    if (!zone) throw ApiError.notFound("ไม่พบโซนจัดส่ง");
    return zone;
  },

  async deleteShippingZone(id) {
    const [zone] = await db
      .update(shippingZones)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shippingZones.id, id))
      .returning();
    if (!zone) throw ApiError.notFound("ไม่พบโซนจัดส่ง");
    return zone;
  },
};
