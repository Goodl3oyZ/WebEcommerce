import express from "express";
import { adminController } from "../controllers/adminController.js";

const router = express.Router();

router.get("/dashboard", adminController.getDashboard);

export default router;
