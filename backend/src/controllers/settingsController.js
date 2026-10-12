let appSettings = {
  siteName: "My Shop",
  maintenance: false,
  theme: "light",
  currency: "THB",
};

export const settingsController = {
  getSettings: (req, res) => {
    res.json({
      success: true,
      data: appSettings,
    });
  },

  getPublicSettings: (req, res) => {
    const { siteName, maintenance, theme, currency } = appSettings;
    res.json({
      success: true,
      data: { siteName, maintenance, theme, currency },
    });
  },

  updateSettings: (req, res) => {
    appSettings = { ...appSettings, ...req.body };
    res.json({
      success: true,
      data: appSettings,
      message: "การตั้งค่าถูกบันทึกเรียบร้อยแล้ว",
    });
  },
};
