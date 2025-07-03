import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { ENV } from "./loadENV.js";
import { authService } from "../services/authService.js";

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await authService.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: ENV.GITHUBAuth.clientID,
      clientSecret: ENV.GITHUBAuth.clientSecret,
      callbackURL: ENV.CALLBACK_URL.github,
      scope: ["user:email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.emails || !profile.emails[0]) {
          profile.emails = [
            {
              value: `${profile.username}@github.com`,
              verified: true,
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

// Google Strategy
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

// Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: ENV.FBAuth.clientID,
      clientSecret: ENV.FBAuth.clientSecret,
      callbackURL: ENV.CALLBACK_URL.facebook,
      profileFields: ["id", "emails", "name", "picture"],
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

export default passport;
