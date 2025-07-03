import { useState, useRef, useEffect } from "react";
import { uploadAPI } from "@/lib/api/upload";
import { toast } from "react-hot-toast";
import { FaTrash, FaUpload, FaImage } from "react-icons/fa";

export default function ImageUpload({
  type,
  onUpload,
  multiple = false,
  maxSizeMB = 5,
  productId,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]); // File[]
  const [uploadedUrls, setUploadedUrls] = useState([]); // string[]
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef();
  const validTypes = ["image/jpeg", "image/png", "image/webp"];

  // Clean up object URLs
  useEffect(() => {
    return () => {
      selectedFiles.forEach(
        (file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl)
      );
    };
  }, [selectedFiles]);

  const handleFileChange = async (e) => {
    let files = multiple ? Array.from(e.target.files) : [e.target.files?.[0]];
    files = files.filter(Boolean);
    if (!files.length) {
      toast.error("No file selected");
      return;
    }
    // Validate all files
    for (let file of files) {
      if (!validTypes.includes(file.type)) {
        toast.error("Only JPG, PNG, and WebP images are allowed");
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`File size must be ≤ ${maxSizeMB}MB`);
        return;
      }
    }
    setError(null);
    // Add previewUrl for each file
    const filesWithPreview = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      return Object.assign(file, { previewUrl });
    });
    setSelectedFiles(filesWithPreview);
    setUploadedUrls([]);
    setUploadProgress(0);
    // Auto-upload after select
    await uploadFiles(filesWithPreview);
  };

  const uploadFiles = async (files) => {
    setLoading(true);
    setUploadProgress(0);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let response;
        switch (type) {
          case "avatar":
            response = await uploadAPI.uploadAvatar(file);
            break;
          case "product":
            response = await uploadAPI.uploadProductImage(file, productId);
            break;
          case "brand":
            response = await uploadAPI.uploadBrandLogo(file);
            break;
          default:
            throw new Error("Invalid upload type");
        }
        urls.push(response.fileName);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (err) {
        setError(err.message || "Error uploading file");
        toast.error(err.message || "Error uploading file");
      }
    }
    setUploadedUrls(urls);
    setLoading(false);
    if (urls.length) onUpload(multiple ? urls : urls[0]);
  };

  const clearFiles = async () => {
    // ลบไฟล์ที่อัปโหลดไปแล้วใน MinIO ตามประเภท
    if (uploadedUrls.length > 0) {
      try {
        if (type === "avatar") {
          await uploadAPI.deleteAvatar();
        } else if (type === "product") {
          await uploadAPI.deleteProductImage();
        } else if (type === "brand") {
          await uploadAPI.deleteBrandLogo();
        } else if (type === "store") {
          await uploadAPI.deleteStoreImage();
        } else if (type === "review") {
          await uploadAPI.deleteReviewImage();
        }
      } catch (err) {
        toast.error("Failed to delete uploaded images from server");
      }
    }
    selectedFiles.forEach(
      (file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl)
    );
    setSelectedFiles([]);
    setUploadedUrls([]);
    setError(null);
    setUploadProgress(0);
    if (onUpload) onUpload(multiple ? [] : "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx) => {
    if (selectedFiles[idx]?.previewUrl)
      URL.revokeObjectURL(selectedFiles[idx].previewUrl);
    const newFiles = selectedFiles.filter((_, i) => i !== idx);
    const newUrls = uploadedUrls.filter((_, i) => i !== idx);
    setSelectedFiles(newFiles);
    setUploadedUrls(newUrls);
    setError(null);
    setUploadProgress(0);
    if (onUpload) onUpload(multiple ? newUrls : newUrls[0] || "");
  };

  return (
    <div className="p-4 border rounded-md max-w-md bg-gray-50">
      <label className="block font-semibold mb-2">
        Upload Image{multiple ? "s" : ""}
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept={validTypes.join(",")}
        onChange={handleFileChange}
        disabled={loading}
        multiple={multiple}
        className="mb-2"
      />
      {selectedFiles.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 font-semibold">
            Selected {selectedFiles.length} file
            {selectedFiles.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="w-20 h-20 border rounded overflow-hidden relative bg-white flex items-center justify-center"
              >
                {file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <FaImage className="text-3xl text-gray-300" />
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-red-500 hover:bg-red-100"
                  title="Remove image"
                  disabled={loading}
                >
                  <FaTrash />
                </button>
                <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate w-full">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={clearFiles}
            disabled={loading}
            className="mt-2 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Selection
          </button>
        </div>
      )}
      {loading && (
        <div className="mb-2">
          <p>Uploading... {uploadProgress}%</p>
          <progress
            max="100"
            value={uploadProgress}
            className="w-full h-3 rounded"
          />
        </div>
      )}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
