import { settingsService } from "../services/settingsService.js";

export const settingsController = {
  async getSettings(req, res) {
    res.json({ success: true, data: await settingsService.getSettings() });
  },

  async getPublicSettings(req, res) {
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, data: await settingsService.getPublicSettings() });
  },

  async updateSettings(req, res) {
    res.json({
      success: true,
      data: await settingsService.updateSettings(req.body),
      message: "การตั้งค่าถูกบันทึกเรียบร้อยแล้ว",
    });
  },
};
