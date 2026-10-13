import { validate as isUuid } from "uuid";
import { FileService } from "../services/fileService.js";
import { userService } from "../services/userService.js";
import { ApiError } from "../utils/ApiError.js";

const requireFile = (req) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (use the "image" field)');
};

/** Optional entity id from the body (e.g. productId); files are grouped under it. */
function entityFolderId(req, idField) {
  const id = req.body?.[idField];
  if (id === undefined || id === "") return "unassigned";
  if (!isUuid(id)) throw ApiError.badRequest(`${idField} must be a UUID`);
  return id;
}

const fileResponse = (type, fileName) => {
  const url = FileService.getFileUrl(FileService.bucketFor(type), fileName);
  return { url, imageUrl: url, fileName };
};

/**
 * Delete a stored file. `ownerId` restricts customers to files under their own
 * folder; admins pass null and may delete any file in the bucket.
 */
async function deleteStoredFile(type, value, ownerId) {
  if (!value) throw ApiError.badRequest("fileName is required");
  const key = FileService.toKey(type, value);
  if (/^https?:\/\//.test(key) || key.includes("..")) {
    throw ApiError.badRequest("fileName is not a file in our storage");
  }
  if (ownerId && !key.startsWith(`${FileService.folderFor(type, ownerId)}/`)) {
    throw ApiError.forbidden("You can only delete your own files");
  }
  await FileService.deleteFile(FileService.bucketFor(type), key);
}

/** Customer-owned images (review photos): stored under the uploader's folder. */
const ownImage = (type) => ({
  async upload(req, res) {
    requireFile(req);
    const fileName = await FileService.uploadByType(req.file, type, req.user.id);
    res.status(201).json(fileResponse(type, fileName));
  },
  async update(req, res) {
    requireFile(req);
    if (req.body?.oldFileName) await deleteStoredFile(type, req.body.oldFileName, req.user.id);
    const fileName = await FileService.uploadByType(req.file, type, req.user.id);
    res.json(fileResponse(type, fileName));
  },
  async remove(req, res) {
    await deleteStoredFile(type, req.body?.fileName, req.user.id);
    res.json({ message: "File deleted" });
  },
});

/** Admin-managed images (products, brands, stores). */
const adminImage = (type, idField) => ({
  async upload(req, res) {
    requireFile(req);
    const fileName = await FileService.uploadByType(req.file, type, entityFolderId(req, idField));
    res.status(201).json(fileResponse(type, fileName));
  },
  async update(req, res) {
    requireFile(req);
    if (req.body?.oldFileName) await deleteStoredFile(type, req.body.oldFileName, null);
    const fileName = await FileService.uploadByType(req.file, type, entityFolderId(req, idField));
    res.json(fileResponse(type, fileName));
  },
  async remove(req, res) {
    await deleteStoredFile(type, req.body?.fileName, null);
    res.json({ message: "File deleted" });
  },
});

const review = ownImage("reviews");
const product = adminImage("products", "productId");
const brand = adminImage("brands", "brandId");
const category = adminImage("categories", "categoryId");
const store = adminImage("stores", "storeId");
const site = adminImage("site", "siteId");

export const uploadController = {
  // Avatar: same behaviour as PUT /api/users/profile with only an avatar.
  async uploadAvatar(req, res) {
    requireFile(req);
    const user = await userService.updateProfile(req.user.id, {}, req.file);
    res.status(200).json({ url: user.avatar, imageUrl: user.avatar, user });
  },
  updateAvatar: (req, res) => uploadController.uploadAvatar(req, res),
  async deleteAvatar(req, res) {
    const user = await userService.deleteAvatar(req.user.id);
    res.json({ message: "Avatar removed", user });
  },

  uploadReviewImage: review.upload,
  updateReviewImage: review.update,
  deleteReviewImage: review.remove,

  uploadProductImage: product.upload,
  updateProductImage: product.update,
  deleteProductImage: product.remove,

  uploadBrandLogo: brand.upload,
  updateBrandLogo: brand.update,
  deleteBrandLogo: brand.remove,

  uploadCategoryImage: category.upload,
  updateCategoryImage: category.update,
  deleteCategoryImage: category.remove,

  uploadSiteImage: site.upload,
  updateSiteImage: site.update,
  deleteSiteImage: site.remove,

  uploadStoreImage: store.upload,
  updateStoreImage: store.update,
  deleteStoreImage: store.remove,
};
