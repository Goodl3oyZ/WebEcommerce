import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { ENV } from "./loadENV.js";
import { authService } from "../services/authService.js";

// Only providers with credentials are registered: an OAuth strategy without a
// clientID throws at startup, which would take the whole API down.
const credentials = {
  github: ENV.GITHUBAuth,
  google: ENV.GOOGLEAuth,
  facebook: ENV.FBAuth,
};
export const configuredProviders = new Set(
  Object.entries(credentials)
    .filter(([, c]) => c.clientID && c.clientSecret)
    .map(([name]) => name)
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await authService.findUserById(id);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(null, false);
  }
});

// GitHub Strategy
if (configuredProviders.has("github")) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: ENV.GITHUBAuth.clientID,
        clientSecret: ENV.GITHUBAuth.clientSecret,
        callbackURL: ENV.CALLBACK_URL.github,
        scope: ["user:email"],
        // Include `verified`/`primary` flags so unverified emails are never linked.
        allRawEmails: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          if (!profile.emails || !profile.emails[0]) {
            profile.emails = [
              {
                // Placeholder address: not owned by the user, so never verified.
                value: `${profile.username}@github.com`,
                verified: false,
              },
            ];
          }
          const user = await authService.findOrCreateOAuthUser(profile, "github");
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// Google Strategy
if (configuredProviders.has("google")) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.GOOGLEAuth.clientID,
        clientSecret: ENV.GOOGLEAuth.clientSecret,
        callbackURL: ENV.CALLBACK_URL.google,
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateOAuthUser(profile, "google");
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// Facebook Strategy
if (configuredProviders.has("facebook")) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: ENV.FBAuth.clientID,
        clientSecret: ENV.FBAuth.clientSecret,
        callbackURL: ENV.CALLBACK_URL.facebook,
        profileFields: ["id", "emails", "name", "picture"],
        // The library default (v3.2) is long retired.
        graphAPIVersion: "v21.0",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateOAuthUser(
            profile,
            "facebook"
          );
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
