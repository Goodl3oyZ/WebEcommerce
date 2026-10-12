import express from "express";
import { addressDataController } from "../controllers/addressDataController.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
router.use(apiRateLimiter);

// Thai administrative divisions (public reference data).
router.get("/provinces", addressDataController.getProvinces);
router.get("/districts", addressDataController.getDistricts);
router.get("/subdistricts", addressDataController.getSubdistricts);

export default router;
