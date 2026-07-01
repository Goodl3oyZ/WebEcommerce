import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { userController } from "../controllers/userController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { userDto } from "../dtos/user.dto.js";
import multer from "multer";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Protected routes (auth required)
router.use(authMiddleware);

// User profile routes
router
  .route("/profile")
  .get(catchAsync(userController.getProfile))
  .put(
    upload.single("avatar"),
    validationMiddleware(userDto.updateProfile),
    catchAsync(userController.updateProfile)
  );
router.delete("/profile/image", catchAsync(userController.deleteProfileImage));

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
  validationMiddleware(userDto.createUser),
  userController.createUser
);
router.post(
  "/create",
  requireRole(ROLES.ADMIN),
  validationMiddleware(userDto.createUser),
  userController.createUser
);
router.get("/:userId", requireRole(ROLES.ADMIN), userController.getUserById);
router.put(
  "/:userId/role",
  requireRole(ROLES.ADMIN),
  validationMiddleware(userDto.updateRole),
  userController.updateUserRole
);

export default router;
