import { addressDataService } from "../services/addressDataService.js";

// Reference data that rarely changes: let browsers and the proxy cache it.
const cacheFor = (res) => res.set("Cache-Control", "public, max-age=86400");

export const addressDataController = {
  async getProvinces(req, res) {
    cacheFor(res).json(await addressDataService.getProvinces());
  },

  async getDistricts(req, res) {
    cacheFor(res).json(await addressDataService.getDistrictsByProvinceName(req.query.province));
  },

  async getSubdistricts(req, res) {
    cacheFor(res).json(
      await addressDataService.getSubdistrictsByDistrictName(req.query.district, req.query.province)
    );
  },
};
