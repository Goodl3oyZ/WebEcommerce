import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { adminService } from "../services/adminService.js";
import { ENV } from "../config/loadENV.js";
import { ApiError } from "../utils/ApiError.js";

const run = promisify(execFile);

/** Seed scripts, in order. "main" and "shipping" DELETE existing data first. */
const SEEDS = {
  address: { scripts: ["src/seed/seed-address-thai.js"], destructive: false },
  shipping: { scripts: ["src/seed/seed-shipping-payment.js"], destructive: true },
  main: { scripts: ["src/seed/seed.js"], destructive: true },
  all: {
    scripts: ["src/seed/seed.js", "src/seed/seed-shipping-payment.js", "src/seed/seed-address-thai.js"],
    destructive: true,
  },
};
export const SEED_CONFIRMATION = "DELETE EXISTING DATA";

export const adminController = {
  async getSeedPreview(req, res) {
    res.json(await adminService.getSeedPreview());
  },

  async getDashboard(req, res) {
    res.json(await adminService.getDashboardData());
  },

  /**
   * Re-seed reference/demo data. The "main" seed deletes every user, product,
   * coupon and store, so: disabled in production unless ALLOW_ADMIN_SEED=true,
   * super_admin only (route), and destructive seeds need an explicit phrase.
   */
  async runSeed(req, res) {
    if (ENV.SERVER.NODE_ENV === "production" && process.env.ALLOW_ADMIN_SEED !== "true") {
      throw new ApiError(403, "Seeding is disabled in production", null, "SEED_DISABLED");
    }
    const { seedType, confirm } = req.body;
    const seed = SEEDS[seedType];
    if (seed.destructive && confirm !== SEED_CONFIRMATION) {
      throw new ApiError(
        400,
        `The "${seedType}" seed deletes existing data. Send confirm: "${SEED_CONFIRMATION}" to proceed.`,
        null,
        "CONFIRMATION_REQUIRED"
      );
    }

    let output = "";
    try {
      for (const script of seed.scripts) {
        const { stdout, stderr } = await run(process.execPath, [script], {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024,
        });
        output += stdout + stderr;
      }
    } catch (error) {
      console.error(`Seed "${seedType}" failed:`, error);
      throw new ApiError(500, `Seed failed: ${error.message}`, null, "SEED_FAILED");
    }
    res.json({ success: true, message: `Seed '${seedType}' completed successfully!`, output: output.slice(-5000) });
  },
};
