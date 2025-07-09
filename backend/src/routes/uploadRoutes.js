import express from "express";
import { uploadSingle } from "../middlewares/fileUploadMiddleware.js";
import { uploadController } from "../controllers/uploadController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();
router.use(authMiddleware); // ใส่ middleware ครอบทั้งหมด

const routes = [
  {
    path: "avatar",
    upload: "uploadAvatar",
    update: "updateAvatar",
    delete: "deleteAvatar",
  },
  {
    path: "product",
    upload: "uploadProductImage",
    update: "updateProductImage",
    delete: "deleteProductImage",
  },
  {
    path: "brand",
    upload: "uploadBrandLogo",
    update: "updateBrandLogo",
    delete: "deleteBrandLogo",
  },
  {
    path: "store",
    upload: "uploadStoreImage",
    update: "updateStoreImage",
    delete: "deleteStoreImage",
  },
  {
    path: "review",
    upload: "uploadReviewImage",
    update: "updateReviewImage",
    delete: "deleteReviewImage",
  },
];

routes.forEach(({ path, upload, update, delete: del }) => {
  router.post(`/${path}`, uploadSingle, uploadController[upload]);
  router.put(`/${path}`, uploadSingle, uploadController[update]);
  router.delete(`/${path}`, uploadController[del]);
});

export default router;
