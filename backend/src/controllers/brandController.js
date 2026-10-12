import { brandService } from "../services/brandService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";

/** Admins see disabled brands (and their products); everyone else does not. */
const adminView = (req) => isAdminRole(req.user?.role);

export const brandController = {
  async getBrands(req, res) {
    res.json(
      await brandService.getBrands(
        { search: req.query.search, includeInactive: adminView(req) },
        parsePagination(req.query)
      )
    );
  },

  async getBrandById(req, res) {
    res.json(await brandService.getBrandById(req.params.id, { includeInactive: adminView(req) }));
  },

  async getBrandProducts(req, res) {
    res.json(
      await brandService.getBrandProducts(
        req.params.id,
        { includeInactive: adminView(req) },
        parsePagination(req.query)
      )
    );
  },

  async createBrand(req, res) {
    res.status(201).json(await brandService.createBrand(req.body));
  },

  async updateBrand(req, res) {
    res.json(await brandService.updateBrand(req.params.id, req.body));
  },

  async deleteBrand(req, res) {
    const brand = await brandService.deleteBrand(req.params.id);
    res.json({ success: true, data: brand, message: "ปิดการใช้งานแบรนด์แล้ว" });
  },
};
