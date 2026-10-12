import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { userController } from "../controllers/userController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { userDto } from "../dtos/user.dto.js";
import multer from "multer";
import { ApiError } from "../utils/ApiError.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("userId", uuidParam("ไม่พบผู้ใช้"));

// Avatars: raster images only. SVG is excluded because uploads are served from
// the site's own origin (/media), where an SVG could run script.
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (AVATAR_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, "Avatar must be a JPEG, PNG, GIF or WebP image"));
  },
});

// Protected routes (auth required)
router.use(authMiddleware);

// User profile routes
router
  .route("/profile")
  .get(userController.getProfile)
  .put(
    upload.single("avatar"),
    validationMiddleware(userDto.updateProfile),
    userController.updateProfile
  );
router.delete("/profile/image", userController.deleteProfileImage);

// User preferences routes
router.get("/preferences", userController.getPreferences);
router.put(
  "/preferences",
  validationMiddleware(userDto.updatePreferences),
  userController.updatePreferences
);

// User orders routes
router.get("/orders", userController.getUserOrders);

// User points routes
router.get("/points", userController.getUserPoints);
router.get("/points/history", userController.getPointsHistory);

// Admin only routes
router.get("/", requireRole(ROLES.ADMIN), userController.getUsers);
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(userDto.adminCreateUser),
  userController.createUser
);
router.post(
  "/create",
  requireRole(ROLES.ADMIN),
  validationMiddleware(userDto.adminCreateUser),
  userController.createUser
);
router.get(
  "/:userId/orders",
  requireRole(ROLES.ADMIN),
  userController.getAdminUserOrders
);
router.patch(
  "/:userId/status",
  requireRole(ROLES.ADMIN),
  validationMiddleware(userDto.setUserActive),
  userController.setUserActive
);
router.get("/:userId", requireRole(ROLES.ADMIN), userController.getUserById);
router.put(
  "/:userId/role",
  requireRole(ROLES.ADMIN),
  validationMiddleware(userDto.updateRole),
  userController.updateUserRole
);

export default router;
