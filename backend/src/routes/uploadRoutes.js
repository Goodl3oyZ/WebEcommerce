import express from "express";
import { uploadSingle } from "../middlewares/fileUploadMiddleware.js";
import { uploadController } from "../controllers/uploadController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();
router.use(authMiddleware); // ใส่ middleware ครอบทั้งหมด

// Upload avatar (profile image)
router.post("/avatar", uploadSingle, uploadController.uploadAvatar);

// Upload product image
router.post("/product", uploadSingle, uploadController.uploadProductImage);

// Upload brand logo
router.post("/brand", uploadSingle, uploadController.uploadBrandLogo);

// Upload store image
router.post("/store", uploadSingle, uploadController.uploadStoreImage);

// Upload review image
router.post("/review", uploadSingle, uploadController.uploadReviewImage);

// Delete avatar (profile image)
router.delete("/avatar", uploadController.deleteAvatar);

// Delete product image
router.delete("/product", uploadController.deleteProductImage);

// Delete brand logo
router.delete("/brand", uploadController.deleteBrandLogo);

// Delete store image
router.delete("/store", uploadController.deleteStoreImage);

// Delete review image
router.delete("/review", uploadController.deleteReviewImage);

// Update avatar (profile image)
router.put("/avatar", uploadSingle, uploadController.updateAvatar);

// Update product image
router.put("/product", uploadSingle, uploadController.updateProductImage);

// Update brand logo
router.put("/brand", uploadSingle, uploadController.updateBrandLogo);

// Update store image
router.put("/store", uploadSingle, uploadController.updateStoreImage);

// Update review image
router.put("/review", uploadSingle, uploadController.updateReviewImage);

export default router;
