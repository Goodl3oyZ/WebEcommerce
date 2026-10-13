import { randomBytes } from "node:crypto";
import { db } from "../config/db.js";
import {
  shippingMethods,
  shippingZones,
  shipments,
  shippingHistory,
  orders,
  addresses,
  orderItems,
} from "../models/schema.js";
import { eq, and, ne, desc, asc, sql, ilike, or, inArray } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { resolveShippingZoneId, zoneProvinces } from "../utils/provinceZones.js";
import { paginationMeta } from "../utils/pagination.js";
import { setOrderStatus } from "./orderLifecycle.js";

export const SHIPMENT_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
];

const generateTrackingNumber = () =>
  `TRK${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;

/** The address's zone; older addresses saved without one are resolved (and fixed) on the fly. */
async function zoneIdForAddress(address) {
  if (address.shippingZoneId) return address.shippingZoneId;
  const zoneId = await resolveShippingZoneId(address.province);
  if (zoneId) await db.update(addresses).set({ shippingZoneId: zoneId }).where(eq(addresses.id, address.id));
  return zoneId;
}

/** Shipment readable by its order's owner or an admin. */
async function assertCanSeeOrder(orderId, actor) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || (!actor.isAdmin && order.userId !== actor.id)) throw ApiError.notFound("Shipment not found");
  return order;
}

async function getShipmentOr404(id) {
  const shipment = await db.query.shipments.findFirst({ where: eq(shipments.id, id) });
  if (!shipment) throw ApiError.notFound("Shipment not found");
  return shipment;
}

export const shippingService = {
  /**
   * Shipping options for an address. When `userId` is given the address must
   * belong to that user. Cost is the method's price for the address's zone.
   */
  async calculateShippingCost(addressId, _items, { userId } = {}) {
    const address = await db.query.addresses.findFirst({
      where: userId ? and(eq(addresses.id, addressId), eq(addresses.userId, userId)) : eq(addresses.id, addressId),
    });
    if (!address) throw ApiError.badRequest("Address not found");
    const zoneId = await zoneIdForAddress(address);
    if (!zoneId) throw ApiError.badRequest("No shipping is available to this address");

    const methods = await db.query.shippingMethods.findMany({
      where: and(eq(shippingMethods.shippingZoneId, zoneId), eq(shippingMethods.isActive, true)),
      orderBy: [asc(shippingMethods.price)],
    });
    return methods.map((method) => ({
      methodId: method.id,
      methodName: method.name,
      cost: Number(method.price),
      estimatedDays: null,
    }));
  },

  /** Methods for an address (customer) or the full list (admins see inactive too). */
  async getShippingMethods({ addressId, userId, includeInactive }) {
    if (addressId) {
      const options = await this.calculateShippingCost(addressId, [], { userId });
      const ids = options.map((o) => o.methodId);
      if (ids.length === 0) return [];
      return db.query.shippingMethods.findMany({
        where: and(eq(shippingMethods.isActive, true), inArray(shippingMethods.id, ids)),
        orderBy: [asc(shippingMethods.price)],
      });
    }
    return db.query.shippingMethods.findMany({
      where: includeInactive ? undefined : eq(shippingMethods.isActive, true),
      orderBy: [asc(shippingMethods.name)],
    });
  },

  async getShippingZones({ includeInactive }) {
    const zones = await db.query.shippingZones.findMany({
      where: includeInactive ? undefined : eq(shippingZones.isActive, true),
      orderBy: [asc(shippingZones.name)],
    });
    return zones.map((zone) => ({ ...zone, provinces: zoneProvinces(zone) }));
  },

  /**
   * Give `zone` exactly `provinces`, taking them away from every other zone,
   * and move existing addresses in those provinces to it. Other zones' lists
   * are written out explicitly so nothing depends on zone names any more.
   */
  async assignProvinces(tx, zoneId, provinces) {
    const wanted = new Set(provinces);
    const zones = await tx.query.shippingZones.findMany();
    for (const other of zones) {
      if (other.id === zoneId) continue;
      const current = zoneProvinces(other);
      const kept = current.filter((p) => !wanted.has(p));
      if (kept.length !== current.length || !Array.isArray(other.provinces)) {
        await tx.update(shippingZones).set({ provinces: kept, updatedAt: new Date() }).where(eq(shippingZones.id, other.id));
      }
    }
    await tx.update(shippingZones).set({ provinces: [...wanted], updatedAt: new Date() }).where(eq(shippingZones.id, zoneId));
    if (wanted.size) {
      await tx
        .update(addresses)
        .set({ shippingZoneId: zoneId })
        .where(and(inArray(addresses.province, [...wanted]), sql`${addresses.shippingZoneId} is distinct from ${zoneId}`));
    }
  },

  /** Called by checkout inside its transaction. */
  async createShippingLabel(orderId, shippingMethodId, txOrDb = db) {
    const method = await txOrDb.query.shippingMethods.findFirst({ where: eq(shippingMethods.id, shippingMethodId) });
    if (!method) throw ApiError.badRequest("Invalid shipping method");
    const trackingNumber = generateTrackingNumber();
    const [shipment] = await txOrDb
      .insert(shipments)
      .values({ orderId, trackingNumber, carrier: method.name, status: "pending" })
      .returning();
    await txOrDb.insert(shippingHistory).values({
      orderId,
      shipmentId: shipment.id,
      trackingNumber,
      carrier: method.name,
      status: "pending",
      description: "Shipment created",
      timestamp: new Date(),
    });
    return { trackingNumber, shipmentId: shipment.id, estimatedDelivery: null };
  },

  async trackShipment(trackingNumber, actor) {
    const shipment = await db.query.shipments.findFirst({ where: eq(shipments.trackingNumber, trackingNumber) });
    if (!shipment) throw ApiError.notFound("Shipment not found");
    await assertCanSeeOrder(shipment.orderId, actor);
    const history = await db.query.shippingHistory.findMany({
      where: eq(shippingHistory.shipmentId, shipment.id),
      orderBy: [desc(shippingHistory.timestamp)],
    });
    return {
      trackingNumber,
      carrier: shipment.carrier,
      status: shipment.status,
      location: shipment.location,
      estimatedDelivery: shipment.estimatedDelivery,
      actualDelivery: shipment.actualDelivery,
      history,
    };
  },

  async getOrderShipment(orderId, actor) {
    await assertCanSeeOrder(orderId, actor);
    const shipment = await db.query.shipments.findFirst({ where: eq(shipments.orderId, orderId) });
    if (!shipment) throw ApiError.notFound("Shipment not found");
    const history = await db.query.shippingHistory.findMany({
      where: eq(shippingHistory.shipmentId, shipment.id),
      orderBy: [desc(shippingHistory.timestamp)],
    });
    return { ...shipment, history };
  },

  // --- Admin: shipments ------------------------------------------------------
  async getAllShipments({ status, search }, pagination) {
    const conditions = [];
    if (status) conditions.push(eq(shipments.status, status));
    if (search) {
      conditions.push(or(ilike(shipments.trackingNumber, `%${search}%`), ilike(orders.orderNumber, `%${search}%`)));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, total] = await Promise.all([
      db
        .select({ shipment: shipments, orderNumber: orders.orderNumber, orderStatus: orders.status })
        .from(shipments)
        .leftJoin(orders, eq(shipments.orderId, orders.id))
        .where(where)
        .orderBy(desc(shipments.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db
        .select({ count: sql`count(*)::int` })
        .from(shipments)
        .leftJoin(orders, eq(shipments.orderId, orders.id))
        .where(where),
    ]);
    return {
      shipments: rows.map((r) => ({ ...r.shipment, orderNumber: r.orderNumber, orderStatus: r.orderStatus })),
      pagination: paginationMeta(total[0].count, pagination),
    };
  },

  async getShipmentById(id) {
    const shipment = await getShipmentOr404(id);
    const history = await db.query.shippingHistory.findMany({
      where: eq(shippingHistory.shipmentId, id),
      orderBy: [desc(shippingHistory.timestamp)],
    });
    return { ...shipment, history };
  },

  /** One shipment per order (checkout normally creates it). */
  async createShipment({ orderId, carrier, trackingNumber, status = "pending", estimatedDelivery }) {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) throw ApiError.notFound("Order not found");
    const existing = await db.query.shipments.findFirst({ where: eq(shipments.orderId, orderId) });
    if (existing) throw new ApiError("This order already has a shipment", 409, null, "SHIPMENT_EXISTS");

    return db.transaction(async (tx) => {
      const number = trackingNumber || generateTrackingNumber();
      const [shipment] = await tx
        .insert(shipments)
        .values({
          orderId,
          carrier,
          trackingNumber: number,
          status,
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        })
        .returning();
      await tx.insert(shippingHistory).values({
        orderId,
        shipmentId: shipment.id,
        trackingNumber: number,
        carrier,
        status,
        description: "Shipment created",
        timestamp: new Date(),
      });
      await tx
        .update(orders)
        .set({ trackingNumber: number, carrier, shippingStatus: status, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
      return shipment;
    });
  },

  /**
   * Update a shipment, record the event, and keep the order in step:
   * shipped/in transit moves a paid order to "shipped", delivered to "delivered".
   */
  async updateShipment(id, data, actorId) {
    const shipment = await getShipmentOr404(id);
    return db.transaction(async (tx) => {
      const changes = { updatedAt: new Date() };
      for (const key of ["status", "location", "trackingNumber", "carrier"]) {
        if (data[key] !== undefined) changes[key] = data[key];
      }
      if (data.estimatedDelivery !== undefined) {
        changes.estimatedDelivery = data.estimatedDelivery ? new Date(data.estimatedDelivery) : null;
      }
      if (data.status === "delivered") changes.actualDelivery = new Date();
      const [updated] = await tx.update(shipments).set(changes).where(eq(shipments.id, id)).returning();

      await tx.insert(shippingHistory).values({
        orderId: shipment.orderId,
        shipmentId: id,
        trackingNumber: updated.trackingNumber,
        carrier: updated.carrier,
        status: updated.status,
        location: data.location ?? null,
        description: data.description ?? null,
        timestamp: new Date(),
      });

      const order = await tx.query.orders.findFirst({ where: eq(orders.id, shipment.orderId) });
      if (order) {
        await tx
          .update(orders)
          .set({
            shippingStatus: updated.status,
            trackingNumber: updated.trackingNumber,
            carrier: updated.carrier,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        const target =
          updated.status === "delivered" ? "delivered" : ["shipped", "in_transit", "out_for_delivery"].includes(updated.status) ? "shipped" : null;
        if (target === "shipped" && ["paid", "confirmed", "processing"].includes(order.status)) {
          const processing =
            order.status === "processing" ? order : await setOrderStatus(tx, order, "processing", { actorId });
          await setOrderStatus(tx, processing, "shipped", { actorId, comment: `Shipped (${updated.trackingNumber})` });
        } else if (target === "delivered" && order.status === "shipped") {
          await setOrderStatus(tx, order, "delivered", { actorId, comment: "Delivered" });
        }
      }
      return updated;
    });
  },

  async getShippingStats() {
    const rows = await db
      .select({ status: shipments.status, count: sql`count(*)::int` })
      .from(shipments)
      .groupBy(shipments.status);
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    return { total: rows.reduce((sum, r) => sum + r.count, 0), byStatus };
  },

  /** Label data for printing; assigns a tracking number if the shipment has none. */
  async generateShippingLabel(id) {
    const shipment = await getShipmentOr404(id);
    if (!shipment.trackingNumber) {
      const trackingNumber = generateTrackingNumber();
      await db.update(shipments).set({ trackingNumber, updatedAt: new Date() }).where(eq(shipments.id, id));
    }
    return this.getShippingLabel(id);
  },

  async getShippingLabel(id) {
    const shipment = await getShipmentOr404(id);
    if (!shipment.trackingNumber) throw ApiError.notFound("No label yet: generate it first");
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, shipment.orderId),
      with: { shippingAddress: true },
    });
    const [{ itemCount }] = await db
      .select({ itemCount: sql`coalesce(sum(${orderItems.quantity}), 0)::int` })
      .from(orderItems)
      .where(eq(orderItems.orderId, shipment.orderId));
    const to = order?.shippingAddress;
    return {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      orderNumber: order?.orderNumber,
      itemCount,
      recipient: to && {
        name: to.fullName,
        phone: to.phoneNumber,
        address: [to.addressLine1, to.addressLine2, to.subdistrict, to.district, to.province, to.postalCode, to.country]
          .filter(Boolean)
          .join(", "),
      },
    };
  },

  // --- Admin: methods and zones ---------------------------------------------
  async createShippingMethod(data) {
    const code = data.code.trim().toUpperCase();
    await this.assertMethodCodeAvailable(code);
    await this.assertZoneExists(data.shippingZoneId);
    const [method] = await db
      .insert(shippingMethods)
      .values({
        name: data.name.trim(),
        code,
        description: data.description || null,
        price: String(data.price),
        isActive: data.isActive ?? true,
        shippingZoneId: data.shippingZoneId,
      })
      .returning();
    return method;
  },

  async updateShippingMethod(id, data) {
    const existing = await db.query.shippingMethods.findFirst({ where: eq(shippingMethods.id, id) });
    if (!existing) throw ApiError.notFound("ไม่พบวิธีการจัดส่ง");
    const changes = { updatedAt: new Date() };
    if (data.name !== undefined) changes.name = data.name.trim();
    if (data.code !== undefined) {
      changes.code = data.code.trim().toUpperCase();
      await this.assertMethodCodeAvailable(changes.code, id);
    }
    if (data.description !== undefined) changes.description = data.description;
    if (data.price !== undefined) changes.price = String(data.price);
    if (data.isActive !== undefined) changes.isActive = data.isActive;
    if (data.shippingZoneId !== undefined) {
      await this.assertZoneExists(data.shippingZoneId);
      changes.shippingZoneId = data.shippingZoneId;
    }
    const [method] = await db.update(shippingMethods).set(changes).where(eq(shippingMethods.id, id)).returning();
    return method;
  },

  /** Methods are disabled, not deleted (orders reference them). */
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
    await this.assertZoneNameAvailable(data.name);
    return db.transaction(async (tx) => {
      const [zone] = await tx
        .insert(shippingZones)
        .values({
          name: data.name.trim(),
          description: data.description || null,
          baseCost: String(data.baseCost),
          provinces: [],
          isActive: data.isActive ?? true,
        })
        .returning();
      if (data.provinces?.length) await this.assignProvinces(tx, zone.id, data.provinces);
      const fresh = await tx.query.shippingZones.findFirst({ where: eq(shippingZones.id, zone.id) });
      return { ...fresh, provinces: zoneProvinces(fresh) };
    });
  },

  async updateShippingZone(id, data) {
    const existing = await db.query.shippingZones.findFirst({ where: eq(shippingZones.id, id) });
    if (!existing) throw ApiError.notFound("ไม่พบโซนจัดส่ง");
    const changes = { updatedAt: new Date() };
    if (data.name !== undefined) {
      await this.assertZoneNameAvailable(data.name, id);
      changes.name = data.name.trim();
    }
    if (data.description !== undefined) changes.description = data.description;
    if (data.baseCost !== undefined) changes.baseCost = String(data.baseCost);
    if (data.isActive !== undefined) changes.isActive = data.isActive;
    // A zone still on the name-based default keeps its provinces when renamed.
    if (!Array.isArray(existing.provinces)) changes.provinces = zoneProvinces(existing);
    return db.transaction(async (tx) => {
      await tx.update(shippingZones).set(changes).where(eq(shippingZones.id, id));
      if (data.provinces !== undefined) await this.assignProvinces(tx, id, data.provinces);
      const zone = await tx.query.shippingZones.findFirst({ where: eq(shippingZones.id, id) });
      return { ...zone, provinces: zoneProvinces(zone) };
    });
  },

  /** Zones are disabled, not deleted (addresses reference them). */
  async deleteShippingZone(id) {
    const [zone] = await db
      .update(shippingZones)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shippingZones.id, id))
      .returning();
    if (!zone) throw ApiError.notFound("ไม่พบโซนจัดส่ง");
    return zone;
  },

  async assertMethodCodeAvailable(code, exceptId) {
    const existing = await db.query.shippingMethods.findFirst({
      where: exceptId ? and(eq(shippingMethods.code, code), ne(shippingMethods.id, exceptId)) : eq(shippingMethods.code, code),
    });
    if (existing) throw ApiError.conflict("รหัสวิธีการจัดส่งนี้ถูกใช้แล้ว");
  },

  async assertZoneNameAvailable(name, exceptId) {
    const trimmed = name.trim();
    const existing = await db.query.shippingZones.findFirst({
      where: exceptId ? and(eq(shippingZones.name, trimmed), ne(shippingZones.id, exceptId)) : eq(shippingZones.name, trimmed),
    });
    if (existing) throw ApiError.conflict("A shipping zone with this name already exists");
  },

  async assertZoneExists(zoneId) {
    const zone = await db.query.shippingZones.findFirst({ where: eq(shippingZones.id, zoneId) });
    if (!zone) throw ApiError.badRequest("Shipping zone not found");
  },
};
