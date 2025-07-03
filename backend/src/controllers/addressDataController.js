import { addressDataService } from "../services/addressDataService.js";

export const addressDataController = {
  async getProvinces(req, res) {
    try {
      const data = await addressDataService.getProvinces();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch provinces" });
    }
  },
  async getDistricts(req, res) {
    try {
      const { province } = req.query;
      const data = await addressDataService.getDistrictsByProvinceName(
        province
      );
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch districts" });
    }
  },
  async getSubdistricts(req, res) {
    try {
      const { district } = req.query;
      const data = await addressDataService.getSubdistrictsByDistrictName(
        district
      );
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch subdistricts" });
    }
  },
};
