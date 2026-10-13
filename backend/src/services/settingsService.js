import { db } from "../config/db.js";
import { appSettings } from "../models/schema.js";
import { inArray, sql } from "drizzle-orm";
import { BUCKETS, deleteFile, getFileUrl, toStoredKey } from "../config/minio.js";
import { ApiError } from "../utils/ApiError.js";

export const DEFAULT_SETTINGS = {
  siteName: "CHALLENGE",
  maintenance: false,
  theme: "light",
  currency: "THB",
  logo: null, // storage key in the "site" bucket
};

/** Settings anyone may read (the storefront needs them before login). */
const PUBLIC_KEYS = ["siteName", "maintenance", "theme", "currency", "logoUrl"];

/** Stored settings plus derived values (the logo's public URL). */
const withDerived = (settings) => ({ ...settings, logoUrl: settings.logo ? getFileUrl(BUCKETS.SITE, settings.logo) : null });

export const settingsService = {
  /** Stored values over defaults. Persisted, so they survive restarts and are shared by every instance. */
  async getSettings() {
    const rows = await db.select().from(appSettings);
    return withDerived({ ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  },

  async getPublicSettings() {
    const all = await this.getSettings();
    return Object.fromEntries(PUBLIC_KEYS.map((key) => [key, all[key]]));
  },

  async updateSettings(input) {
    const changes = { ...input };
    let replacedLogo = null;
    if (changes.logo !== undefined) {
      // Only files uploaded through /api/uploads/site (stored as keys, not URLs).
      const key = changes.logo ? toStoredKey(BUCKETS.SITE, changes.logo) : null;
      if (key && (/^https?:\/\//.test(key) || key.includes("..") || !key.startsWith("site-"))) {
        throw new ApiError(400, "logo must be a file uploaded with /api/uploads/site", null, "INVALID_LOGO");
      }
      const current = (await this.getSettings()).logo;
      if (current && current !== key) replacedLogo = current;
      changes.logo = key;
    }
    // null resets a setting to its default (values are stored as non-null JSON).
    const cleared = Object.keys(changes).filter((key) => changes[key] === null);
    if (cleared.length) await db.delete(appSettings).where(inArray(appSettings.key, cleared));
    const entries = Object.entries(changes).filter(([, value]) => value !== null);
    if (entries.length) {
      await db
        .insert(appSettings)
        .values(entries.map(([key, value]) => ({ key, value, updatedAt: new Date() })))
        .onConflictDoUpdate({ target: appSettings.key, set: { value: sql`excluded.value`, updatedAt: new Date() } });
    }
    // The old logo file is no longer used anywhere.
    if (replacedLogo) await deleteFile(BUCKETS.SITE, replacedLogo).catch(() => {});
    return this.getSettings();
  },
};
