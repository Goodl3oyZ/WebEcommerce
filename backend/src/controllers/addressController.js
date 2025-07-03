import { addressService } from "../services/addressService.js";
import { ApiError } from "../utils/ApiError.js";

export const addressController = {
  // Get user's addresses
  async getUserAddresses(req, res, next) {
    try {
      const result = await addressService.getUserAddresses(req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // Create new address
  async createAddress(req, res, next) {
    try {
      const address = await addressService.createAddress({
        ...req.body,
        userId: req.user.id,
      });
      res.status(201).json(address);
    } catch (error) {
      next(error);
    }
  },

  // Update address
  async updateAddress(req, res, next) {
    try {
      const address = await addressService.updateAddress(
        req.params.id,
        req.user.id,
        req.body
      );
      res.json(address);
    } catch (error) {
      next(error);
    }
  },

  // Set default address
  async setDefaultAddress(req, res, next) {
    try {
      const result = await addressService.setDefaultAddress(
        req.params.id,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // Delete address
  async deleteAddress(req, res, next) {
    try {
      const result = await addressService.deleteAddress(
        req.params.id,
        req.user.id
      );

      // 204 No Content สำหรับการลบสำเร็จ
      res.status(204).send();
    } catch (error) {
      // กรณีลบ default address ที่มี address อื่นเหลืออยู่
      if (error instanceof ApiError && error.data?.alternativeAddresses) {
        return res.status(error.statusCode).json({
          message: error.message,
          alternativeAddresses: error.data.alternativeAddresses,
        });
      }
      next(error);
    }
  },

  // Admin: Get all addresses
  async getAllAddresses(req, res, next) {
    try {
      // ควรเพิ่มการตรวจสอบบทบาท admin ก่อน
      if (!req.user.isAdmin) {
        throw new ApiError("Unauthorized", 403);
      }

      const addresses = await addressService.getAllAddresses();
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  },

  // Admin: Get user's addresses
  async getUserAddressesAdmin(req, res, next) {
    try {
      // ตรวจสอบบทบาท admin
      if (!req.user.isAdmin) {
        throw new ApiError("Unauthorized", 403);
      }

      const addresses = await addressService.getUserAddresses(
        req.params.userId
      );
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  },

  // Get address by ID (for current user)
  async getAddressById(req, res, next) {
    try {
      const address = await addressService.getAddressById(
        req.params.id,
        req.user.id
      );
      res.json(address);
    } catch (error) {
      next(error);
    }
  },

  // Admin: Get any address by ID
  async getAddressByIdAdmin(req, res, next) {
    try {
      // ตรวจสอบบทบาท admin
      if (!req.user.isAdmin) {
        throw new ApiError("Unauthorized", 403);
      }

      const address = await addressService.getAddressById(
        req.params.id,
        req.params.userId // อนุญาตให้ admin เข้าถึง address ของ user อื่น
      );
      res.json(address);
    } catch (error) {
      next(error);
    }
  },

  // Reorder addresses
  async reorderAddresses(req, res, next) {
    try {
      const { newPosition } = req.body;
      if (typeof newPosition !== "number" || newPosition < 0) {
        throw new ApiError("Invalid position value", 400);
      }

      const result = await addressService.reorderAddresses(
        req.params.id,
        req.user.id,
        newPosition
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
