export const settingsController = {
  getSettings: (req, res) => {
    res.json({
      siteName: "My Shop",
      maintenance: false,
      theme: "light",
    });
  },
};
