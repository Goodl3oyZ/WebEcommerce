import { db } from "../config/db.js";
import { addresses } from "../models/schema.js";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { shippingZones } from "../models/schema.js";

// Helper function to handle default address logic
const handleDefaultAddress = async (
  userId,
  newAddressId = null,
  isDefault = false
) => {
  if (isDefault) {
    // Reset all other default addresses
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
  } else if (newAddressId) {
    // Check if this is the only address for the user
    const [addressCount] = await db
      .select({ count: sql`count(*)` })
      .from(addresses)
      .where(eq(addresses.userId, userId));

    if (addressCount.count === 1) {
      // If this is the only address, force it to be default
      await db
        .update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, newAddressId));
    }
  }
};

// Get all addresses for a user
const getUserAddresses = async (userId) => {
  const addressesList = await db.query.addresses.findMany({
    where: eq(addresses.userId, userId),
    orderBy: [desc(addresses.isDefault), asc(addresses.createdAt)],
  });
  return { addresses: addressesList };
};

// ตัวอย่าง mapping จังหวัด → shippingZoneId (ใช้ชื่อโซนจาก seed)
const provinceToZone = {
  // Central
  กรุงเทพมหานคร: "Central",
  นนทบุรี: "Central",
  ปทุมธานี: "Central",
  สมุทรปราการ: "Central",
  พระนครศรีอยุธยา: "Central",
  อ่างทอง: "Central",
  ลพบุรี: "Central",
  สิงห์บุรี: "Central",
  ชัยนาท: "Central",
  สระบุรี: "Central",
  นครปฐม: "Central",
  สมุทรสาคร: "Central",
  สมุทรสงคราม: "Central",
  สุพรรณบุรี: "Central",
  // North
  เชียงใหม่: "North",
  เชียงราย: "North",
  ลำปาง: "North",
  ลำพูน: "North",
  แม่ฮ่องสอน: "North",
  แพร่: "North",
  น่าน: "North",
  พะเยา: "North",
  อุตรดิตถ์: "North",
  ตาก: "North",
  สุโขทัย: "North",
  พิษณุโลก: "North",
  พิจิตร: "North",
  กำแพงเพชร: "North",
  นครสวรรค์: "North",
  อุทัยธานี: "North",
  // Northeast
  นครราชสีมา: "Northeast",
  บุรีรัมย์: "Northeast",
  สุรินทร์: "Northeast",
  ศรีสะเกษ: "Northeast",
  อุบลราชธานี: "Northeast",
  ยโสธร: "Northeast",
  ชัยภูมิ: "Northeast",
  อำนาจเจริญ: "Northeast",
  บึงกาฬ: "Northeast",
  หนองบัวลำภู: "Northeast",
  ขอนแก่น: "Northeast",
  อุดรธานี: "Northeast",
  เลย: "Northeast",
  หนองคาย: "Northeast",
  มหาสารคาม: "Northeast",
  ร้อยเอ็ด: "Northeast",
  กาฬสินธุ์: "Northeast",
  สกลนคร: "Northeast",
  นครพนม: "Northeast",
  มุกดาหาร: "Northeast",
  // East
  ชลบุรี: "East",
  ระยอง: "East",
  จันทบุรี: "East",
  ตราด: "East",
  ฉะเชิงเทรา: "East",
  ปราจีนบุรี: "East",
  สระแก้ว: "East",
  // West
  ราชบุรี: "West",
  กาญจนบุรี: "West",
  เพชรบุรี: "West",
  ประจวบคีรีขันธ์: "West",
  // South
  นครศรีธรรมราช: "South",
  กระบี่: "South",
  พังงา: "South",
  ภูเก็ต: "South",
  สุราษฎร์ธานี: "South",
  ระนอง: "South",
  ชุมพร: "South",
  สงขลา: "South",
  สตูล: "South",
  ตรัง: "South",
  พัทลุง: "South",
  ปัตตานี: "South",
  ยะลา: "South",
  นราธิวาส: "South",
};

async function mapProvinceToShippingZoneId(province) {
  if (!province) return null;
  const zoneName = provinceToZone[province.trim()];
  if (!zoneName) {
    console.warn("[ShippingZone] Province not mapped:", province);
    return null;
  }
  const zone = await db.query.shippingZones.findFirst({
    where: eq(shippingZones.name, zoneName),
  });
  return zone ? zone.id : null;
}

// Create a new address
const createAddress = async (addressData) => {
  const { isDefault = false, ...restData } = addressData;

  // Map shippingZoneId
  const shippingZoneId = await mapProvinceToShippingZoneId(
    addressData.province
  );

  // Check if this is the first address
  const [addressCount] = await db
    .select({ count: sql`count(*)` })
    .from(addresses)
    .where(eq(addresses.userId, addressData.userId));

  const forceDefault = addressCount.count === 0;

  const [newAddress] = await db
    .insert(addresses)
    .values({
      ...restData,
      shippingZoneId,
      isDefault: forceDefault || isDefault,
      position: addressCount.count,
    })
    .returning();

  // Handle default address logic
  await handleDefaultAddress(
    addressData.userId,
    newAddress.id,
    forceDefault || isDefault
  );

  return newAddress;
};

// Update an address
const updateAddress = async (addressId, userId, updateData) => {
  const { isDefault, ...restData } = updateData;

  const [address] = await db.query.addresses.findMany({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    limit: 1,
  });

  if (!address) {
    throw new ApiError("Address not found", 404);
  }

  // Map shippingZoneId (ถ้า province เปลี่ยน)
  let shippingZoneId = address.shippingZoneId;
  if (restData.province && restData.province !== address.province) {
    shippingZoneId = await mapProvinceToShippingZoneId(restData.province);
  }

  // Handle default address logic if isDefault is being changed
  if (typeof isDefault !== "undefined") {
    await handleDefaultAddress(userId, null, isDefault);
  }

  const [updatedAddress] = await db
    .update(addresses)
    .set({
      ...restData,
      shippingZoneId,
      isDefault:
        typeof isDefault !== "undefined" ? isDefault : address.isDefault,
    })
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .returning();

  return updatedAddress;
};

// Set an address as default
const setDefaultAddress = async (addressId, userId) => {
  const [address] = await db.query.addresses.findMany({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    limit: 1,
  });

  if (!address) {
    throw new ApiError("Address not found", 404);
  }

  if (address.isDefault) {
    throw new ApiError("Address is already default", 400);
  }

  await handleDefaultAddress(userId, null, true);

  const [updatedAddress] = await db
    .update(addresses)
    .set({ isDefault: true })
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .returning();

  return updatedAddress;
};

// Delete an address
const deleteAddress = async (addressId, userId) => {
  const [address] = await db.query.addresses.findMany({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    limit: 1,
  });

  if (!address) {
    throw new ApiError("Address not found", 404);
  }

  // If deleting the default address and there are other addresses
  if (address.isDefault) {
    const otherAddresses = await db.query.addresses.findMany({
      where: and(
        eq(addresses.userId, userId),
        eq(addresses.id, addressId, { not: true })
      ),
      limit: 1,
    });

    if (otherAddresses.length > 0) {
      throw new ApiError(
        "Cannot delete default address without selecting a new default",
        400,
        { alternativeAddresses: otherAddresses }
      );
    }
  }

  await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

  return { message: "Address deleted successfully" };
};

// Get address by ID
const getAddressById = async (addressId, userId) => {
  const [address] = await db.query.addresses.findMany({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    limit: 1,
  });

  if (!address) {
    throw new ApiError("Address not found", 404);
  }

  return address;
};

export const addressService = {
  getUserAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  getAddressById,
};
