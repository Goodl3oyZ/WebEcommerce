import { db } from "../config/db.js";
import { stores, pickupLocations, pickups, orders } from "../models/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

export const storePickupService = {
  async createPickupLocation(userId, storeId, locationData) {
    // Check if store exists and user is authorized
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new Error("Store not found");
    }

    if (store.ownerId !== userId) {
      throw new Error("Not authorized to manage pickup locations");
    }

    // Create pickup location
    const [location] = await db
      .insert(pickupLocations)
      .values({
        storeId,
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        postalCode: locationData.postalCode,
        country: locationData.country,
        phone: locationData.phone,
        email: locationData.email,
        operatingHours: locationData.operatingHours,
        capacity: locationData.capacity,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    return location;
  },

  async getPickupLocations(storeId) {
    // Check if store exists
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new Error("Store not found");
    }

    const locations = await db.query.pickupLocations.findMany({
      where: and(
        eq(pickupLocations.storeId, storeId),
        eq(pickupLocations.isActive, true)
      ),
    });

    return locations;
  },

  async updatePickupLocation(userId, storeId, locationId, locationData) {
    // Check if store exists and user is authorized
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new Error("Store not found");
    }

    if (store.ownerId !== userId) {
      throw new Error("Not authorized to manage pickup locations");
    }

    // Check if location exists
    const location = await db.query.pickupLocations.findFirst({
      where: and(
        eq(pickupLocations.id, locationId),
        eq(pickupLocations.storeId, storeId)
      ),
    });

    if (!location) {
      throw new Error("Pickup location not found");
    }

    // Update location
    const [updatedLocation] = await db
      .update(pickupLocations)
      .set({
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        postalCode: locationData.postalCode,
        country: locationData.country,
        phone: locationData.phone,
        email: locationData.email,
        operatingHours: locationData.operatingHours,
        capacity: locationData.capacity,
        updatedAt: new Date(),
      })
      .where(eq(pickupLocations.id, locationId))
      .returning();

    return updatedLocation;
  },

  async deletePickupLocation(userId, storeId, locationId) {
    // Check if store exists and user is authorized
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new Error("Store not found");
    }

    if (store.ownerId !== userId) {
      throw new Error("Not authorized to manage pickup locations");
    }

    // Check if location exists
    const location = await db.query.pickupLocations.findFirst({
      where: and(
        eq(pickupLocations.id, locationId),
        eq(pickupLocations.storeId, storeId)
      ),
    });

    if (!location) {
      throw new Error("Pickup location not found");
    }

    // Delete location
    await db.delete(pickupLocations).where(eq(pickupLocations.id, locationId));
  },

  async getPickupAvailability(storeId, locationId, date) {
    // Check if store and location exist
    const [store, location] = await Promise.all([
      db.query.stores.findFirst({
        where: eq(stores.id, storeId),
      }),
      db.query.pickupLocations.findFirst({
        where: and(
          eq(pickupLocations.id, locationId),
          eq(pickupLocations.storeId, storeId)
        ),
      }),
    ]);

    if (!store) {
      throw new Error("Store not found");
    }

    if (!location) {
      throw new Error("Pickup location not found");
    }

    // Get operating hours for the date
    const operatingHours = location.operatingHours[new Date(date).getDay()];
    const timeSlots = [];

    // Generate time slots based on operating hours
    if (operatingHours && operatingHours.isOpen) {
      const startTime = new Date(`${date}T${operatingHours.open}`);
      const endTime = new Date(`${date}T${operatingHours.close}`);

      // Generate 30-minute slots
      for (
        let time = startTime;
        time < endTime;
        time.setMinutes(time.getMinutes() + 30)
      ) {
        timeSlots.push({
          time: time.toISOString(),
          available: true,
        });
      }
    }

    // Get booked slots
    const bookedSlots = await db.query.pickups.findMany({
      where: and(
        eq(pickups.locationId, locationId),
        sql`DATE(pickup_time) = ${date}`
      ),
    });

    // Mark booked slots as unavailable
    for (const slot of timeSlots) {
      const isBooked = bookedSlots.some((booking) => {
        const bookingTime = new Date(booking.pickupTime);
        return bookingTime.toISOString() === slot.time;
      });

      if (isBooked) {
        slot.available = false;
      }
    }

    return {
      date,
      locationId,
      timeSlots,
    };
  },

  async schedulePickup(userId, storeId, locationId, orderId, pickupTime) {
    // Check if store and location exist
    const [store, location] = await Promise.all([
      db.query.stores.findFirst({
        where: eq(stores.id, storeId),
      }),
      db.query.pickupLocations.findFirst({
        where: and(
          eq(pickupLocations.id, locationId),
          eq(pickupLocations.storeId, storeId)
        ),
      }),
    ]);

    if (!store) {
      throw new Error("Store not found");
    }

    if (!location) {
      throw new Error("Pickup location not found");
    }

    // Check if order exists and belongs to user
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Check if time slot is available
    const availability = await this.getPickupAvailability(
      storeId,
      locationId,
      new Date(pickupTime).toISOString().split("T")[0]
    );
    const timeSlot = availability.timeSlots.find(
      (slot) => slot.time === pickupTime
    );

    if (!timeSlot || !timeSlot.available) {
      throw new Error("Time slot not available");
    }

    // Create pickup record
    const [pickup] = await db
      .insert(pickups)
      .values({
        orderId,
        locationId,
        userId,
        pickupTime: new Date(pickupTime),
        status: "scheduled",
        createdAt: new Date(),
      })
      .returning();

    return pickup;
  },

  async cancelPickup(userId, storeId, pickupId) {
    // Check if store exists
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new Error("Store not found");
    }

    // Check if pickup exists and belongs to user
    const pickup = await db.query.pickups.findFirst({
      where: and(eq(pickups.id, pickupId), eq(pickups.userId, userId)),
    });

    if (!pickup) {
      throw new Error("Pickup not found");
    }

    // Check if pickup can be cancelled
    if (pickup.status !== "scheduled") {
      throw new Error("Pickup cannot be cancelled");
    }

    // Cancel pickup
    await db
      .update(pickups)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(pickups.id, pickupId));
  },

  async getPickupHistory(userId, storeId, { page = 1, limit = 10 }) {
    // Check if store exists
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new Error("Store not found");
    }

    // Check if user is authorized
    if (store.ownerId !== userId) {
      throw new Error("Not authorized to view pickup history");
    }

    const offset = (page - 1) * limit;

    const [pickups, total] = await Promise.all([
      db.query.pickups.findMany({
        where: eq(pickups.storeId, storeId),
        orderBy: [desc(pickups.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(pickups)
        .where(eq(pickups.storeId, storeId)),
    ]);

    return {
      pickups,
      pagination: {
        total: total[0].count,
        page,
        limit,
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },
};
