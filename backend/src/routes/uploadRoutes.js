import express from "express";
import { uploadSingle } from "../middlewares/fileUploadMiddleware.js";
import { uploadController } from "../controllers/uploadController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
router.use(apiRateLimiter);
router.use(authMiddleware);

const userRoutes = [
  {
    path: "avatar",
    upload: "uploadAvatar",
    update: "updateAvatar",
    delete: "deleteAvatar",
  },
  {
    path: "review",
    upload: "uploadReviewImage",
    update: "updateReviewImage",
    delete: "deleteReviewImage",
  },
];

const adminRoutes = [
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
    path: "category",
    upload: "uploadCategoryImage",
    update: "updateCategoryImage",
    delete: "deleteCategoryImage",
  },
  {
    path: "store",
    upload: "uploadStoreImage",
    update: "updateStoreImage",
    delete: "deleteStoreImage",
  },
];

const registerRoutes = (routes, middleware = []) => {
  routes.forEach(({ path, upload, update, delete: del }) => {
    router.post(`/${path}`, ...middleware, uploadSingle, uploadController[upload]);
    router.put(`/${path}`, ...middleware, uploadSingle, uploadController[update]);
    router.delete(`/${path}`, ...middleware, uploadController[del]);
  });
};

registerRoutes(userRoutes);
registerRoutes(adminRoutes, [requireRole(ROLES.ADMIN)]);

export default router;
