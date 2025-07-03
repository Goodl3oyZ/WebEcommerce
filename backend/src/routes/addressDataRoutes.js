import express from "express";
import { addressDataController } from "../controllers/addressDataController.js";

const router = express.Router();

router.get("/provinces", addressDataController.getProvinces);
router.get("/districts", addressDataController.getDistricts);
router.get("/subdistricts", addressDataController.getSubdistricts);

export default router;
