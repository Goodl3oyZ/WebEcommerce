import express from "express";
import passport, { configuredProviders } from "../config/passport.js";
import { oauthController, oauthFailureUrl } from "../controllers/oauthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

const scopes = {
  github: ["user:email"],
  google: ["profile", "email"],
  facebook: ["email"],
};

const requireConfigured = (provider) => (req, res, next) =>
  configuredProviders.has(provider)
    ? next()
    : res.redirect(oauthFailureUrl("PROVIDER_NOT_CONFIGURED"));

// Login state lives in our own session/cookies, so passport sessions are off.
const callback = (provider) => (req, res, next) =>
  passport.authenticate(provider, { session: false }, (err, user) => {
    if (err || !user) return res.redirect(oauthFailureUrl(err?.code));
    req.user = user;
    return oauthController.oauthCallback(req, res, next);
  })(req, res, next);

for (const provider of Object.keys(scopes)) {
  router.get(
    `/${provider}`,
    requireConfigured(provider),
    (req, res, next) =>
      passport.authenticate(provider, { scope: scopes[provider], session: false })(req, res, next)
  );
  router.get(`/${provider}/callback`, requireConfigured(provider), callback(provider));
}

router.get("/me", authMiddleware, oauthController.getMe);
router.get("/logout", oauthController.logout);

export default router;
