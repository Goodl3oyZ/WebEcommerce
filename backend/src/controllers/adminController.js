import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { adminService } from "../services/adminService.js";
import { demoDataService } from "../services/demoDataService.js";
import { auditService, writeAuditLog } from "../services/auditService.js";
import { ENV } from "../config/loadENV.js";
import { ApiError } from "../utils/ApiError.js";

const run = promisify(execFile);

/** Seed scripts, in order. "main" and "shipping" DELETE existing data first. */
// `production`: reference data a live shop needs (Thai addresses; shipping
// zones/methods and payment methods). Allowed in production; "main" and "all",
// which delete users and products, are not (unless ALLOW_ADMIN_SEED=true).
const SEEDS = {
  address: { scripts: ["src/seed/seed-address-thai.js"], destructive: false, production: true },
  shipping: { scripts: ["src/seed/seed-shipping-payment.js"], destructive: true, production: true },
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

  async getDemoData(req, res) {
    res.json(await demoDataService.status({ actorId: req.user.id }));
  },

  async installDemoData(req, res) {
    const created = await demoDataService.install();
    await writeAuditLog({ actorId: req.user.id, entity: "demo_data", action: "install", after: created });
    res.status(201).json({ success: true, created });
  },

  async removeDemoData(req, res) {
    const removed = await demoDataService.remove({ actorId: req.user.id });
    await writeAuditLog({ actorId: req.user.id, entity: "demo_data", action: "remove", after: removed });
    res.json({ success: true, removed });
  },

  async getDashboard(req, res) {
    res.json(await adminService.getDashboardData());
  },

  async listAuditLogs(req, res) {
    res.json(await auditService.list(req.query));
  },

  /**
   * Re-seed reference/demo data. The "main" seed deletes every user, product,
   * coupon and store, so in production only the reference-data seeds run
   * (unless ALLOW_ADMIN_SEED=true); super_admin only (route), and destructive
   * seeds need an explicit phrase.
   */
  async runSeed(req, res) {
    const { seedType, confirm } = req.body;
    const seed = SEEDS[seedType];
    if (ENV.SERVER.NODE_ENV === "production" && !seed.production && process.env.ALLOW_ADMIN_SEED !== "true") {
      throw new ApiError(
        403,
        `The "${seedType}" seed deletes users and products, so it is disabled in production`,
        null,
        "SEED_DISABLED"
      );
    }
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
