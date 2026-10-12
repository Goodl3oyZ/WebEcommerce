import { addressService } from "../services/addressService.js";
import { userService } from "../services/userService.js";
import { parsePagination } from "../utils/pagination.js";

export const addressController = {
  async getUserAddresses(req, res) {
    res.json(await addressService.getUserAddresses(req.user.id));
  },

  async createAddress(req, res) {
    res.status(201).json(await addressService.createAddress(req.user.id, req.body));
  },

  async updateAddress(req, res) {
    res.json(await addressService.updateAddress(req.params.id, req.user.id, req.body));
  },

  async setDefaultAddress(req, res) {
    res.json(await addressService.setDefaultAddress(req.params.id, req.user.id));
  },

  async deleteAddress(req, res) {
    await addressService.deleteAddress(req.params.id, req.user.id);
    res.status(204).send();
  },

  // --- Admin ---------------------------------------------------------------
  async getAllAddresses(req, res) {
    res.json(await addressService.getAllAddresses({ search: req.query.search }, parsePagination(req.query)));
  },

  async getUserAddressesAdmin(req, res) {
    await userService.getUserById(req.params.userId); // 404 for unknown users
    res.json(await addressService.getUserAddresses(req.params.userId));
  },

  async getAddressByIdAdmin(req, res) {
    res.json(await addressService.getAddressByIdAdmin(req.params.id));
  },
};
