import multer from "multer";
import { ENV } from "../config/loadENV.js";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (ENV.UPLOAD.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"), false);
    }
  },
  limits: {
    fileSize: ENV.UPLOAD.MAX_FILE_SIZE,
  },
});

export const uploadSingle = upload.single("image");

export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `File size is too large. Maximum size is ${ENV.UPLOAD.MAX_FILE_SIZE} bytes`,
      });
    }
    return res.status(400).json({
      error: err.message,
    });
  }
  next(err);
};
