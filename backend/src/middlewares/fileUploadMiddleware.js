import multer from "multer";
import { ENV } from "../config/loadENV.js";
import { ApiError } from "../utils/ApiError.js";
import { SAFE_IMAGE_TYPES } from "../services/fileService.js";

// ALLOWED_FILE_TYPES can narrow the list but never add unsafe types (e.g. SVG).
const allowedTypes = ENV.UPLOAD.ALLOWED_FILE_TYPES.filter((type) => SAFE_IMAGE_TYPES.includes(type));

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest(`File type not allowed. Allowed: ${allowedTypes.join(", ")}`));
  },
  limits: { fileSize: ENV.UPLOAD.MAX_FILE_SIZE, files: 1 },
});

/** Single file in the "image" field. Multer errors are mapped in errorHandler. */
export const uploadSingle = upload.single("image");
