import multer from "multer";

// ใช้ memoryStorage สำหรับ MinIO
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // จำกัดขนาดไฟล์ 5MB
  },
});

export const uploadSingle = upload.single("image");

// Middleware สำหรับจัดการ error จาก multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size is too large. Maximum size is 5MB",
      });
    }
    return res.status(400).json({
      error: err.message,
    });
  }
  next(err);
};
