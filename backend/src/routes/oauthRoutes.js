import express from "express";
import passport from "../config/passport.js";
import { oauthController } from "../controllers/oauthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  oauthController.oauthCallback
);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  oauthController.oauthCallback
);

router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  oauthController.oauthCallback
);

router.get("/me", authMiddleware, oauthController.getMe);
router.get("/logout", oauthController.logout);

export default router;
