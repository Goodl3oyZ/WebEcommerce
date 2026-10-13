import { db } from "../config/db.js";
import { addresses, orders, users } from "../models/schema.js";
import { eq, and, ne, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { resolveShippingZoneId } from "../utils/provinceZones.js";
import { paginationMeta } from "../utils/pagination.js";

const ADDRESS_FIELDS = [
  "fullName",
  "phoneNumber",
  "addressLine1",
  "addressLine2",
  "country",
  "province",
  "district",
  "subdistrict",
  "city",
  "state",
  "postalCode",
];
const pick = (data) =>
  Object.fromEntries(ADDRESS_FIELDS.filter((k) => data[k] !== undefined).map((k) => [k, data[k]]));

/** The customer's own addresses (archived ones belong to order history only). */
const ownActive = (userId) => and(eq(addresses.userId, userId), isNull(addresses.archivedAt));

/** Whether any order points at this address (its contents are then history). */
async function usedByOrders(tx, addressId) {
  const [row] = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(or(eq(orders.shippingAddressId, addressId), eq(orders.billingAddressId, addressId)))
    .limit(1);
  return Boolean(row);
}

const archive = (tx, addressId) =>
  tx.update(addresses).set({ archivedAt: new Date(), isDefault: false, updatedAt: new Date() }).where(eq(addresses.id, addressId));

async function findOwn(txOrDb, addressId, userId) {
  const address = await txOrDb.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), ownActive(userId)),
  });
  if (!address) throw ApiError.notFound("Address not found");
  return address;
}

const clearDefault = (tx, userId) =>
  tx.update(addresses).set({ isDefault: false }).where(and(ownActive(userId), eq(addresses.isDefault, true)));

const byDefaultThenPosition = [desc(addresses.isDefault), asc(addresses.position), asc(addresses.createdAt)];

export const addressService = {
  async getUserAddresses(userId) {
    return { addresses: await db.query.addresses.findMany({ where: ownActive(userId), orderBy: byDefaultThenPosition }) };
  },

  async getAddressById(addressId, userId) {
    return findOwn(db, addressId, userId);
  },

  /** The first address is always the default; a new default replaces the old one. */
  async createAddress(userId, data) {
    return db.transaction(async (tx) => {
      const [{ count }] = await tx
        .select({ count: sql`count(*)::int` })
        .from(addresses)
        .where(ownActive(userId));
      const isDefault = count === 0 || Boolean(data.isDefault);
      if (isDefault) await clearDefault(tx, userId);

      const [address] = await tx
        .insert(addresses)
        .values({
          ...pick(data),
          userId,
          shippingZoneId: await resolveShippingZoneId(data.province, tx),
          isDefault,
          position: count,
        })
        .returning();
      return address;
    });
  },

  /**
   * Addresses that orders refer to are copied on write: the old row is
   * archived (orders keep showing where they were sent) and the edited copy
   * replaces it, so the returned address may have a new id.
   */
  async updateAddress(addressId, userId, data) {
    return db.transaction(async (tx) => {
      const address = await findOwn(tx, addressId, userId);
      const fields = pick(data);
      const contentChanged = Object.keys(fields).some((k) => (fields[k] ?? null) !== (address[k] ?? null));
      const changes = { ...fields, updatedAt: new Date() };
      if (data.province !== undefined && data.province !== address.province) {
        changes.shippingZoneId = await resolveShippingZoneId(data.province, tx);
      }
      if (data.isDefault === true && !address.isDefault) {
        await clearDefault(tx, userId);
        changes.isDefault = true;
      } else if (data.isDefault === false && address.isDefault) {
        throw ApiError.badRequest("Choose another address as default instead of unsetting this one");
      }
      if (contentChanged && (await usedByOrders(tx, addressId))) {
        await archive(tx, addressId);
        const { id, createdAt, archivedAt, ...rest } = address;
        const [copy] = await tx
          .insert(addresses)
          .values({ ...rest, ...changes, isDefault: changes.isDefault ?? address.isDefault })
          .returning();
        return copy;
      }
      const [updated] = await tx.update(addresses).set(changes).where(eq(addresses.id, addressId)).returning();
      return updated;
    });
  },

  /** Idempotent. */
  async setDefaultAddress(addressId, userId) {
    return db.transaction(async (tx) => {
      const address = await findOwn(tx, addressId, userId);
      if (address.isDefault) return address;
      await clearDefault(tx, userId);
      const [updated] = await tx
        .update(addresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(addresses.id, addressId))
        .returning();
      return updated;
    });
  },

  /**
   * Deleting the default promotes the next address. Addresses used by orders
   * are archived instead (hidden from the customer, kept for order history).
   */
  async deleteAddress(addressId, userId) {
    return db.transaction(async (tx) => {
      const address = await findOwn(tx, addressId, userId);
      if (await usedByOrders(tx, addressId)) await archive(tx, addressId);
      else await tx.delete(addresses).where(eq(addresses.id, addressId));
      if (address.isDefault) {
        const next = await tx.query.addresses.findFirst({
          where: and(ownActive(userId), ne(addresses.id, addressId)),
          orderBy: [asc(addresses.position), asc(addresses.createdAt)],
        });
        if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
      }
    });
  },

  // --- Admin ---------------------------------------------------------------
  async getAllAddresses({ search }, pagination) {
    const where = and(
      isNull(addresses.archivedAt),
      search
        ? or(
            ilike(addresses.fullName, `%${search}%`),
            ilike(addresses.phoneNumber, `%${search}%`),
            ilike(addresses.postalCode, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        : undefined
    );
    const [rows, total] = await Promise.all([
      db
        .select({ address: addresses, user: { id: users.id, name: users.name, email: users.email } })
        .from(addresses)
        .leftJoin(users, eq(addresses.userId, users.id))
        .where(where)
        .orderBy(desc(addresses.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db
        .select({ count: sql`count(*)::int` })
        .from(addresses)
        .leftJoin(users, eq(addresses.userId, users.id))
        .where(where),
    ]);
    return {
      addresses: rows.map(({ address, user }) => ({ ...address, user })),
      pagination: paginationMeta(total[0].count, pagination),
    };
  },

  async getAddressByIdAdmin(addressId) {
    const address = await db.query.addresses.findFirst({ where: eq(addresses.id, addressId) });
    if (!address) throw ApiError.notFound("Address not found");
    return address;
  },
};
