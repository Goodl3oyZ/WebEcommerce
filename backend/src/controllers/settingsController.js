let appSettings = {
  siteName: "My Shop",
  maintenance: false,
  theme: "light",
  currency: "THB",
};

export const settingsController = {
  getSettings: (req, res) => {
    res.json(appSettings);
  },

  getPublicSettings: (req, res) => {
    const { siteName, maintenance, theme, currency } = appSettings;
    res.json({ siteName, maintenance, theme, currency });
  },

  updateSettings: (req, res) => {
    appSettings = { ...appSettings, ...req.body };
    res.json(appSettings);
  },
};
