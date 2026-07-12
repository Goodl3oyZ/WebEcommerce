"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import {
  FaBoxOpen,
  FaEdit,
  FaTrash,
  FaPlusCircle,
  FaImage,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaMinus,
  FaSave,
  FaArrowLeft,
  FaArrowRight,
  FaEye,
  FaList,
  FaTh,
} from "react-icons/fa";
import { productsAPI } from "@/lib/api";
import { brandsAPI } from "@/lib/api";
import { categoriesAPI } from "@/lib/api";
import { uploadAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import RichTextEditor from "@/components/ui/RichTextEditor";
import ImageUploader from "@/components/ui/ImageUploader";
import ProductTable from "@/components/ui/ProductTable";
// Mock API functions (replace with your actual API)
const mockAPI = {
  products: {
    getAll: async () => productsAPI.getAllProducts(),
    create: async (data) => productsAPI.createProduct(data),
    update: async (id, data) => productsAPI.updateProduct(id, data),
    delete: async (id) => productsAPI.deleteProduct(id),
  },
  variants: {
    createBatch: async (productId, variants) => {
      // สร้าง variants ทีละตัว เพราะ backend รองรับทีละตัว
      console.log("=== mockAPI.variants.createBatch START ==="); // Debug log
      console.log("productId:", productId); // Debug log
      console.log("variants:", variants); // Debug log
      const results = [];
      for (const variant of variants) {
        console.log("Creating single variant:", variant); // Debug log
        const result = await productsAPI.createVariant(productId, variant);
        results.push(result);
      }
      console.log("=== mockAPI.variants.createBatch END ==="); // Debug log
      return results;
    },
    update: async (productId, variantId, data) =>
      productsAPI.updateVariant(productId, variantId, data),
    delete: async (productId, variantId) =>
      productsAPI.deleteVariant(productId, variantId),
  },
  brands: {
    getAll: async () => brandsAPI.getAllBrands(),
  },
  categories: {
    getAll: async () => categoriesAPI.getAllCategories(),
  },
};

// Utility functions
const generateSKU = (productName, variantName) => {
  const productCode = productName.substring(0, 3).toUpperCase();
  const variantCode = variantName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${productCode}-${variantCode}-${timestamp}`;
};

const calculateProductStock = (variants) => {
  return variants.reduce((total, variant) => total + (variant.stock || 0), 0);
};

const generateVariantCombinations = (attributes) => {
  if (!attributes || Object.keys(attributes).length === 0) return [];

  const combinations = [];
  const keys = Object.keys(attributes);
  const values = keys.map((key) => attributes[key]);

  const cartesian = (arr) =>
    arr.reduce((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]]);

  const combos = cartesian(values);

  return combos.map((combo) => {
    const variant = {};
    keys.forEach((key, index) => {
      variant[key] = combo[index];
    });

    // Generate variant name
    const variantName = keys.map((key) => variant[key]).join(" / ");

    return {
      ...variant,
      color: variant.color || "Default",
      size: variant.size || "Default",
      sku: "",
      price: 0,
      stock: 0,
    };
  });
};

export function ProductsPanel() {
  // Get authentication context
  const { user, isLoading: isAuthLoading } = useAuth();
  // State management
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  // Form state
  const [productData, setProductData] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [attributes, setAttributes] = useState({});
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");
  const [selectedAttributeForValue, setSelectedAttributeForValue] =
    useState("");
  // Remove unused refs and functions

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      brandId: "",
      isActive: true,
      hasVariants: false, // <-- New default value
      price: 0, // For single variant product
      stock: 0, // For single variant product
    },
  });

  const watchHasVariants = watch("hasVariants"); // Watch the hasVariants field

  const steps = [
    { title: "ข้อมูลพื้นฐาน", icon: FaBoxOpen },
    { title: "จัดการตัวเลือก", icon: FaEdit },
    { title: "ตรวจสอบ & บันทึก", icon: FaSave },
  ];

  // Load initial data
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [productsRes, brandsRes, categoriesRes] = await Promise.all([
        mockAPI.products.getAll(),
        mockAPI.brands.getAll(),
        mockAPI.categories.getAll(),
      ]);

      setProducts(productsRes.products || []);
      setBrands(brandsRes.brands || []);
      setCategories(categoriesRes.categories || []);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form and state
  const resetForm = () => {
    setCurrentStep(0);
    setProductData(null);
    setUploadedImages([]);
    setVariants([]);
    setAttributes({});
    setEditingProduct(null);
    reset({
      name: "",
      description: "",
      categoryId: "",
      brandId: "",
      isActive: true,
      hasVariants: false,
      price: 0,
      stock: 0,
    });
  };

  // Step 1: Basic product information
  const handleBasicInfoSubmit = async (data) => {
    // Convert types for backend validation and handle NaN
    const priceNum = Number(data.price);
    const stockNum = Number(data.stock);
    const fixedData = {
      ...data,
      price: isNaN(priceNum) ? 0 : priceNum,
      stock: isNaN(stockNum) ? 0 : stockNum,
      isActive:
        typeof data.isActive === "string"
          ? data.isActive === "true"
          : !!data.isActive,
    };
    setProductData(fixedData);

    if (!fixedData.hasVariants) {
      // If no variants, create a single default variant from product's price and stock
      setVariants([
        {
          color: "Default",
          size: "Default",
          sku: generateSKU(fixedData.name, "Default"),
          price: fixedData.price,
          stock: fixedData.stock,
        },
      ]);
      setCurrentStep(2); // Skip to review if no variants
    } else {
      // Initialize with one default variant only if no attributes are defined yet, otherwise use existing attributes or generate fresh
      if (Object.keys(attributes).length === 0 && variants.length === 0) {
        setVariants([
          {
            color: "Default",
            size: "Default",
            sku: generateSKU(fixedData.name, "Default"),
            price: 0,
            stock: 0,
          },
        ]);
      }
      setCurrentStep(1); // Go to variant management
    }
  };

  // Attribute management
  const addAttribute = () => {
    if (!newAttributeName.trim()) {
      toast.error("กรุณากรอกชื่อคุณสมบัติ");
      return;
    }
    if (attributes[newAttributeName.trim()]) {
      toast.error("ชื่อคุณสมบัตินี้มีอยู่แล้ว");
      return;
    }

    setAttributes((prev) => ({
      ...prev,
      [newAttributeName.trim()]: [],
    }));
    setNewAttributeName("");
    toast.success(`เพิ่มคุณสมบัติ "${newAttributeName.trim()}" สำเร็จ`);
  };

  const removeAttribute = (attributeName) => {
    setAttributes((prev) => {
      const newAttrs = { ...prev };
      delete newAttrs[attributeName];
      return newAttrs;
    });
    // Regenerate variants if attributes change
    if (Object.keys(attributes).length === 1 && attributeName in attributes) {
      // If only one attribute was left and it's removed, reset variants
      setVariants([
        {
          color: "Default",
          size: "Default",
          sku: generateSKU(productData.name, "Default"),
          price: 0,
          stock: 0,
        },
      ]);
    } else {
      generateVariants();
    }
  };

  const addAttributeValue = () => {
    if (!selectedAttributeForValue || !newAttributeValue.trim()) {
      toast.error("กรุณาเลือกคุณสมบัติและกรอกค่า");
      return;
    }
    if (
      attributes[selectedAttributeForValue].includes(newAttributeValue.trim())
    ) {
      toast.error("ค่าของคุณสมบัตินี้มีอยู่แล้ว");
      return;
    }

    setAttributes((prev) => ({
      ...prev,
      [selectedAttributeForValue]: [
        ...prev[selectedAttributeForValue],
        newAttributeValue.trim(),
      ],
    }));
    setNewAttributeValue("");
    toast.success(
      `เพิ่มค่า "${newAttributeValue.trim()}" ในคุณสมบัติ "${selectedAttributeForValue}" สำเร็จ`
    );
  };

  const removeAttributeValue = (attributeName, value) => {
    setAttributes((prev) => ({
      ...prev,
      [attributeName]: prev[attributeName].filter((v) => v !== value),
    }));
  };

  // Generate variants from attributes
  // This should be called whenever attributes or their values change
  useEffect(() => {
    if (watchHasVariants && productData && Object.keys(attributes).length > 0) {
      const combinations = generateVariantCombinations(attributes);
      if (combinations.length > 0) {
        // Keep existing variant data if possible, otherwise initialize
        const newVariants = combinations.map((newCombo) => {
          const existingVariant = variants.find((v) => {
            // Check if all attributes match
            return Object.keys(newCombo).every(
              (attrKey) => newCombo[attrKey] === v[attrKey]
            );
          });
          if (existingVariant) {
            // Preserve existing price, stock etc. for matching variants
            return { ...existingVariant, ...newCombo, name: newCombo.name };
          } else {
            return {
              ...newCombo,
              color: newCombo.color || "Default",
              size: newCombo.size || "Default",
              sku: generateSKU(productData.name, newCombo.name),
              price: 0,
              stock: 0,
            };
          }
        });
        setVariants(newVariants);
      } else {
        // If all attributes/values are removed, revert to single default variant
        setVariants([
          {
            color: "Default",
            size: "Default",
            sku: generateSKU(productData.name, "Default"),
            price: 0,
            stock: 0,
          },
        ]);
      }
    } else if (
      watchHasVariants &&
      Object.keys(attributes).length === 0 &&
      variants.length === 0
    ) {
      // If hasVariants is true but no attributes set yet, initialize a default variant
      setVariants([
        {
          color: "Default",
          size: "Default",
          sku: productData ? generateSKU(productData.name, "Default") : "",
          price: 0,
          stock: 0,
        },
      ]);
    }
  }, [attributes, watchHasVariants, productData?.name]); // Re-run when attributes or hasVariants change

  // Update variant
  const updateVariant = (index, field, value) => {
    setVariants((prev) =>
      prev.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    );
  };

  // Remove variant
  const removeVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Add manual variant (only if hasVariants is true)
  const addManualVariant = () => {
    if (!watchHasVariants) return; // Should not be accessible if hasVariants is false

    const newVariant = {
      color: "Default",
      size: "Default",
      sku: generateSKU(productData.name, `Variant ${variants.length + 1}`),
      price: 0,
      stock: 0,
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  // Final save
  const handleFinalSave = async () => {
    if (!productData || variants.length === 0) {
      toast.error("ข้อมูลไม่ครบถ้วน");
      return;
    }

    setIsLoading(true);
    try {
      // Calculate total stock
      const totalStock = calculateProductStock(variants);

      // Strictly coerce price and stock to numbers before sending
      const priceNum = Number(productData.price);
      const stockNum = Number(productData.stock);
      const fixedProductData = {
        ...productData,
        price: isNaN(priceNum) ? 0 : priceNum,
        stock: isNaN(stockNum) ? 0 : stockNum,
      };

      // Create product (ไม่มีรูปภาพก่อน)
      const productPayload = {
        ...fixedProductData,
        price: isNaN(priceNum) ? 0 : priceNum, // force number
        stock: isNaN(stockNum) ? 0 : stockNum, // force number
        imageUrl: [], // ยังไม่มีรูปภาพ
        stock: totalStock, // This `stock` will be the sum of variant stocks
        hasVariants: watchHasVariants, // Use the actual value from the form
      };

      const productResponse = await mockAPI.products.create(productPayload);

      if (productResponse.status === 201) {
        // สร้าง variants ตามสถานะ hasVariants
        if (watchHasVariants) {
          // สถานะ 2: มีหลาย variants - สร้างแต่ละ variant แยก
          const variantsPayload = variants.map((variant) => {
            const vPrice = Number(variant.price);
            const vStock = Number(variant.stock);
            return {
              // แปลงข้อมูลให้ตรงกับ backend schema
              color: variant.color || "Default",
              size: variant.size || "Default",
              sku: variant.sku,
              price: isNaN(vPrice) ? 0 : vPrice,
              stock: isNaN(vStock) ? 0 : vStock,
            };
          });

          await mockAPI.variants.createBatch(
            productResponse.data.id,
            variantsPayload
          );
        } else {
          // สถานะ 1: ไม่มี variants - สร้าง default variant เดียว
          const defaultVariant = {
            color: "Default",
            size: "Default",
            sku: generateSKU(productData.name, "Default"),
            price: fixedProductData.price,
            stock: fixedProductData.stock,
          };

          await mockAPI.variants.createBatch(productResponse.data.id, [
            defaultVariant,
          ]);
        }

        // อัปโหลดรูปภาพหลังจากสร้างสินค้า (ถ้ามีรูปภาพที่เลือก)
        if (uploadedImages.length > 0) {
          try {
            const uploadedUrls = await uploadImages(
              uploadedImages,
              productResponse.data.id
            );

            // อัปเดตสินค้าให้มีรูปภาพ
            await mockAPI.products.update(productResponse.data.id, {
              imageUrl: uploadedUrls,
            });

            toast.success("อัปโหลดรูปภาพสำเร็จ");
          } catch (error) {
            console.error("Upload error:", error);
            toast.error(
              "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ แต่สินค้าถูกสร้างแล้ว"
            );
          }
        }

        toast.success("บันทึกสินค้าสำเร็จ!");
        resetForm();
        loadInitialData();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?")) return;

    setIsLoading(true);
    try {
      await mockAPI.products.delete(productId);
      toast.success("ลบสินค้าสำเร็จ!");
      loadInitialData();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการลบสินค้า");
    } finally {
      setIsLoading(false);
    }
  };

  // Step component
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              index <= currentStep
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            {index < currentStep ? <FaCheckCircle /> : <step.icon />}
          </div>
          <span
            className={`ml-2 text-sm font-medium ${
              index <= currentStep ? "text-blue-600" : "text-gray-500"
            }`}
          >
            {step.title}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-1 mx-4 ${
                index < currentStep ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // เพิ่มฟังก์ชัน generateVariants ที่หายไป
  const generateVariants = () => {
    if (Object.keys(attributes).length === 0) {
      toast.error("กรุณากำหนดคุณสมบัติก่อน");
      return;
    }

    const combinations = generateVariantCombinations(attributes);
    if (combinations.length > 0) {
      // Keep existing variant data if possible, otherwise initialize
      const newVariants = combinations.map((newCombo) => {
        const existingVariant = variants.find((v) => {
          // Check if all attributes match
          return Object.keys(newCombo).every(
            (attrKey) => newCombo[attrKey] === v[attrKey]
          );
        });
        if (existingVariant) {
          // Preserve existing price, stock etc. for matching variants
          return { ...existingVariant, ...newCombo, name: newCombo.name };
        } else {
          return {
            ...newCombo,
            color: newCombo.color || "Default",
            size: newCombo.size || "Default",
            sku: generateSKU(productData.name, newCombo.name),
            price: 0,
            stock: 0,
          };
        }
      });
      setVariants(newVariants);
      toast.success(`สร้าง ${newVariants.length} variants สำเร็จ`);
    }
  };

  // เพิ่มฟังก์ชัน handleEditProduct ที่หายไป
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductData({
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      brandId: product.brandId,
      isActive: product.isActive,
      hasVariants: product.hasVariants,
      price: product.price,
      stock: product.stock,
    });

    // Convert existing images to the new format
    const existingImages = (product.imageUrl || []).map((url, index) => ({
      id: `existing-${index}`,
      url,
      isPrimary: index === 0, // First image is primary
    }));
    setUploadedImages(existingImages);

    setCurrentStep(0);
    // TODO: Load variants if product has variants
  };

  // เก็บไฟล์ที่เลือกไว้ (ไม่อัปโหลดทันที)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"

  // เพิ่มฟังก์ชันอัปโหลดรูปภาพจริง (จะเรียกตอนบันทึกสินค้า)
  const uploadImages = async (images, productId) => {
    // Check if user is authenticated
    if (!user) {
      throw new Error("คุณต้องเข้าสู่ระบบก่อนอัปโหลดรูปภาพ");
    }

    const uploadedUrls = [];
    for (const image of images) {
      try {
        console.log(
          "Uploading file:",
          image.file?.name || "existing image",
          "for product:",
          productId
        );

        // If it's a new file, upload it
        if (image.file) {
          const response = await uploadAPI.uploadProductImage(
            image.file,
            productId
          );
          console.log("Upload response:", response);

          // ตรวจสอบ response format
          if (response.url) {
            uploadedUrls.push(response.url);
          } else if (response.imageUrl) {
            uploadedUrls.push(response.imageUrl);
          } else {
            console.error("Unexpected response format:", response);
            throw new Error("Invalid response format from upload API");
          }
        } else if (image.url) {
          // If it's an existing image, keep the URL
          uploadedUrls.push(image.url);
        }
      } catch (error) {
        console.error(
          "Upload error for image:",
          image.file?.name || image.url,
          error
        );

        // Provide more specific error messages
        let errorMessage = `เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ ${
          image.file?.name || "รูปภาพ"
        }`;
        if (error.status === 401) {
          errorMessage = "คุณต้องเข้าสู่ระบบก่อนอัปโหลดรูปภาพ";
        } else if (error.status === 413) {
          errorMessage = `ไฟล์ ${image.file?.name} มีขนาดใหญ่เกินไป (สูงสุด 5MB)`;
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }

        toast.error(errorMessage);
        throw error;
      }
    }
    return uploadedUrls;
  };

  // Handle image changes from ImageUploader component
  const handleImagesChange = (newImages) => {
    setUploadedImages(newImages);
  };

  // Show loading or authentication message
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Product Management System
            </h1>
            <p className="text-gray-600">
              คุณต้องเข้าสู่ระบบก่อนเข้าถึงหน้าจัดการสินค้า
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {" "}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-4 sm:p-6 border-b">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Product Management System
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              จัดการสินค้าและตัวเลือกสินค้า
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <StepIndicator />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Form Section */}
              <div className="lg:col-span-2">
                {/* Step 1: Basic Information */}
                {currentStep === 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      ข้อมูลพื้นฐานสินค้า
                    </h2>
                    <form
                      onSubmit={handleSubmit(handleBasicInfoSubmit)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ชื่อสินค้า *
                          </label>
                          <input
                            {...register("name", {
                              required: "กรุณากรอกชื่อสินค้า",
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="ชื่อสินค้า"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            สถานะ
                          </label>
                          <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                              <select
                                {...field}
                                value={
                                  field.value === true
                                    ? "true"
                                    : field.value === false
                                    ? "false"
                                    : field.value
                                }
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="true">เปิดใช้งาน</option>
                                <option value="false">ปิดใช้งาน</option>
                              </select>
                            )}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          รายละเอียดสินค้า *
                        </label>
                        <RichTextEditor
                          value={watch("description")}
                          onChange={(value) => setValue("description", value)}
                          placeholder="รายละเอียดสินค้า..."
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.description.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            หมวดหมู่ *
                          </label>
                          <Controller
                            name="categoryId"
                            control={control}
                            rules={{ required: "กรุณาเลือกหมวดหมู่" }}
                            render={({ field }) => (
                              <select
                                {...field}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">เลือกหมวดหมู่</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                          {errors.categoryId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.categoryId.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            แบรนด์ *
                          </label>
                          <Controller
                            name="brandId"
                            control={control}
                            rules={{ required: "กรุณาเลือกแบรนด์" }}
                            render={({ field }) => (
                              <select
                                {...field}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">เลือกแบรนด์</option>
                                {brands.map((brand) => (
                                  <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                          {errors.brandId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.brandId.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* New: Has Variants Toggle */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="hasVariants"
                          {...register("hasVariants")}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor="hasVariants"
                          className="text-sm font-medium text-gray-700"
                        >
                          สินค้ามีหลายตัวเลือก (เช่น สี, ขนาด)
                        </label>
                      </div>

                      {/* Show price and stock only if no variants */}
                      {!watchHasVariants && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ราคา *
                            </label>
                            <input
                              type="number"
                              {...register("price", {
                                required: "กรุณากรอกราคา",
                                min: { value: 0, message: "ราคาต้องไม่ติดลบ" },
                                valueAsNumber: true,
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="ราคา"
                              min="0"
                              step="0.01"
                            />
                            {errors.price && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.price.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              สต็อก *
                            </label>
                            <input
                              type="number"
                              {...register("stock", {
                                required: "กรุณากรอกสต็อก",
                                min: { value: 0, message: "สต็อกต้องไม่ติดลบ" },
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="สต็อก"
                              min="0"
                              step="1"
                            />
                            {errors.stock && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.stock.message}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          รูปภาพสินค้า
                        </label>
                        <ImageUploader
                          images={uploadedImages}
                          onImagesChange={handleImagesChange}
                          maxImages={10}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <FaArrowRight />
                          ถัดไป
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 2: Variant Management (Conditional based on hasVariants) */}
                {currentStep === 1 && watchHasVariants && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      จัดการตัวเลือกสินค้า
                    </h2>

                    {/* Attribute Management */}
                    <div className="mb-6">
                      <h3 className="text-md font-medium mb-3">
                        กำหนดคุณสมบัติ (Attributes)
                      </h3>

                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newAttributeName}
                          onChange={(e) => setNewAttributeName(e.target.value)}
                          placeholder="ชื่อคุณสมบัติ (เช่น สี, ขนาด)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={addAttribute}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-1"
                        >
                          <FaPlus />
                          เพิ่ม
                        </button>
                      </div>

                      {Object.keys(attributes).length > 0 && (
                        <div className="space-y-3">
                          {Object.keys(attributes).map((attributeName) => (
                            <div
                              key={attributeName}
                              className="border rounded-md p-3 bg-white"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{attributeName}</h4>
                                <button
                                  type="button"
                                  onClick={() => removeAttribute(attributeName)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <FaTrash />
                                </button>
                              </div>

                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={
                                    selectedAttributeForValue === attributeName
                                      ? newAttributeValue
                                      : ""
                                  }
                                  onChange={(e) => {
                                    setSelectedAttributeForValue(attributeName);
                                    setNewAttributeValue(e.target.value);
                                  }}
                                  placeholder="ค่าของคุณสมบัติ"
                                  className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={addAttributeValue}
                                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                                >
                                  เพิ่ม
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {attributes[attributeName].map((value) => (
                                  <span
                                    key={value}
                                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                                  >
                                    {value}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeAttributeValue(
                                          attributeName,
                                          value
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={generateVariants}
                            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
                          >
                            <FaEdit />
                            สร้าง Variants จากคุณสมบัติ
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Variant List */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-md font-medium">
                          รายการตัวเลือกสินค้า
                        </h3>
                        <button
                          type="button"
                          onClick={addManualVariant}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 flex items-center gap-1 text-sm"
                        >
                          <FaPlus />
                          เพิ่ม Manual
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 rounded-md">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                สี / ขนาด
                              </th>
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                SKU
                              </th>
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                ราคา
                              </th>
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                สต็อก
                              </th>
                              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                สถานะ
                              </th>
                              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700">
                                จัดการ
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map((variant, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-3 py-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={variant.color || ""}
                                      onChange={(e) =>
                                        updateVariant(
                                          index,
                                          "color",
                                          e.target.value
                                        )
                                      }
                                      placeholder="สี"
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={variant.size || ""}
                                      onChange={(e) =>
                                        updateVariant(
                                          index,
                                          "size",
                                          e.target.value
                                        )
                                      }
                                      placeholder="ขนาด"
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={variant.sku}
                                    onChange={(e) =>
                                      updateVariant(
                                        index,
                                        "sku",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={variant.price}
                                    onChange={(e) =>
                                      updateVariant(
                                        index,
                                        "price",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={variant.stock}
                                    onChange={(e) =>
                                      updateVariant(
                                        index,
                                        "stock",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    min="0"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={variant.isActive}
                                    onChange={(e) =>
                                      updateVariant(
                                        index,
                                        "isActive",
                                        e.target.value === "true"
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    <option value={true}>เปิดใช้งาน</option>
                                    <option value={false}>ปิดใช้งาน</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeVariant(index)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={
                                      variants.length === 1 &&
                                      Object.keys(attributes).length === 0
                                    } // Prevent deleting last variant if no attributes defined
                                  >
                                    <FaTrash />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>รวมสต็อกทั้งหมด:</strong>{" "}
                          {calculateProductStock(variants)} ชิ้น
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(0)}
                        className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FaArrowLeft />
                        กลับ
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                      >
                        <FaArrowRight />
                        ถัดไป
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Save */}
                {currentStep === 2 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      ตรวจสอบข้อมูลและบันทึก
                    </h2>

                    {productData && (
                      <div className="space-y-4">
                        <h3 className="text-md font-medium">
                          ข้อมูลสินค้าหลัก
                        </h3>
                        <p>
                          <strong>ชื่อสินค้า:</strong> {productData.name}
                        </p>
                        <p>
                          <strong>รายละเอียด:</strong> {productData.description}
                        </p>
                        <p>
                          <strong>หมวดหมู่:</strong>{" "}
                          {categories.find(
                            (cat) => cat.id == productData.categoryId
                          )?.name || "N/A"}
                        </p>
                        <p>
                          <strong>แบรนด์:</strong>{" "}
                          {brands.find(
                            (brand) => brand.id == productData.brandId
                          )?.name || "N/A"}
                        </p>
                        <p>
                          <strong>สถานะ:</strong>{" "}
                          {productData.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </p>
                        <p>
                          <strong>มีหลายตัวเลือก:</strong>{" "}
                          {productData.hasVariants ? "ใช่" : "ไม่"}
                        </p>

                        {uploadedImages.length > 0 && (
                          <div>
                            <h3 className="text-md font-medium mt-4">
                              รูปภาพสินค้า ({uploadedImages.length} รูป)
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                              {uploadedImages.map((image, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={image.url || image}
                                    alt={`Product ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-md"
                                  />
                                  {image.isPrimary && (
                                    <div className="absolute top-1 right-1 bg-blue-500 text-white px-1 py-0.5 rounded text-xs">
                                      Primary
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <h3 className="text-md font-medium mt-6">
                          ข้อมูลตัวเลือกสินค้า
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border border-gray-300 rounded-md">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                  สี / ขนาด
                                </th>
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                  SKU
                                </th>
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                  ราคา
                                </th>
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                  สต็อก
                                </th>
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                  สถานะ
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map((variant, index) => (
                                <tr key={index} className="border-t">
                                  <td className="px-3 py-2 text-sm">
                                    {variant.color || "Default"} /{" "}
                                    {variant.size || "Default"}
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    {variant.sku}
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    {Number(variant.price).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    {variant.stock}
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    {variant.isActive
                                      ? "เปิดใช้งาน"
                                      : "ปิดใช้งาน"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-800">
                            <strong>รวมสต็อกทั้งหมด:</strong>{" "}
                            {calculateProductStock(variants)} ชิ้น
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between mt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(watchHasVariants ? 1 : 0)} // Go back to step 1 if hasVariants, else step 0
                        className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FaArrowLeft />
                        กลับ
                      </button>
                      <button
                        type="button"
                        onClick={handleFinalSave}
                        disabled={isLoading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <FaSave />
                        บันทึกสินค้า
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Product List Section */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">สินค้าทั้งหมด</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewMode("table")}
                        className={`p-2 rounded ${
                          viewMode === "table"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                        title="Table View"
                      >
                        <FaList size={14} />
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded ${
                          viewMode === "grid"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                        title="Grid View"
                      >
                        <FaTh size={14} />
                      </button>
                    </div>
                  </div>

                  {viewMode === "table" ? (
                    <ProductTable
                      products={products}
                      categories={categories}
                      brands={brands}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      onView={(product) => {
                        handleEditProduct(product);
                        setCurrentStep(0);
                      }}
                      isLoading={isLoading}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">
                                {product.name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {categories.find(
                                  (cat) => cat.id == product.categoryId
                                )?.name || "N/A"}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title="แก้ไข"
                              >
                                <FaEdit size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="ลบ"
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>
                              ฿{Number(product.price).toLocaleString()}
                            </span>
                            <span>{product.stock} ชิ้น</span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                product.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {product.isActive ? "เปิด" : "ปิด"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 text-center">
                    <button
                      onClick={resetForm}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
                    >
                      <FaPlusCircle />
                      เพิ่มสินค้าใหม่
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Toaster />
      </div>
    </>
  );
}
