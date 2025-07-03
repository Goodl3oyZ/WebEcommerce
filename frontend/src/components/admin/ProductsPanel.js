"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-hot-toast";
import { productsAPI } from "@/lib/api/products";
import { brandsAPI } from "@/lib/api/brands";
import { categoriesAPI } from "@/lib/api/categories";
import ImageUpload from "@/components/ImageUpload";
import {
  FaBoxOpen,
  FaEdit,
  FaTrash,
  FaPlusCircle,
  FaImage,
  FaTimesCircle,
  FaCheckCircle,
  FaPlus,
  FaMinus,
} from "react-icons/fa";

const steps = ["ข้อมูลหลัก", "อัปโหลดรูป", "จัดการ Variants"];

export function ProductsPanel() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(0); // 0 = ข้อมูลหลัก, 1 = อัปโหลดรูป, 2 = Variants
  const [createdProduct, setCreatedProduct] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [createdProductHasVariant, setCreatedProductHasVariant] =
    useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
    watch,
  } = useForm();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [prods, brs, cats] = await Promise.all([
          productsAPI.getAllProducts(),
          brandsAPI.getAllBrands(),
          categoriesAPI.getAllCategories(),
        ]);
        setProducts(prods.products || []);
        setBrands(brs.brands || []);
        setCategories(cats.categories || []);
      } catch (error) {
        toast.error("Failed to load initial data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Step 0: สร้างสินค้า (ข้อมูลหลัก)
  const onSubmitMain = async (data) => {
    setIsLoading(true);
    try {
      const hasVariant = data.hasVariant === "true" || data.hasVariant === true;
      setCreatedProductHasVariant(hasVariant);
      const payload = {
        ...data,
        hasVariant,
        price: Number(data.price),
        stock: hasVariant ? 0 : Number(data.stock),
        categoryId: data.categoryId,
        brandId: data.brandId,
        imageUrl: [],
      };
      const response = await productsAPI.createProduct(payload);
      if (response.status === 200 || response.status === 201) {
        setCreatedProduct(response.data);
        setStep(1);
        toast.success("สร้างสินค้าสำเร็จ! กรุณาอัปโหลดรูปภาพ");
      } else {
        toast.error("สร้างสินค้าไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("สร้างสินค้าไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: อัปโหลดรูป
  const handleImagesUploaded = async (fileNames) => {
    if (!createdProduct) return;
    setIsLoading(true);
    try {
      const response = await productsAPI.updateProduct(createdProduct.id, {
        imageUrl: fileNames,
      });
      if (response.status === 200 || response.status === 201) {
        setUploadedImages(fileNames);
        if (!createdProductHasVariant) {
          toast.success("เพิ่มสินค้าเสร็จสมบูรณ์!");
          setStep(0);
          setCreatedProduct(null);
          setUploadedImages([]);
          setVariants([]);
          reset();
          // โหลด product list ใหม่
          const prods = await productsAPI.getAllProducts();
          setProducts(prods.products || []);
          return;
        }
        setStep(2);
        toast.success("อัปโหลดรูปภาพสำเร็จ! กรุณาเพิ่ม Variants");
      } else {
        toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: จัดการ Variants
  const handleSaveVariants = async () => {
    if (!createdProduct) return;
    setIsLoading(true);
    try {
      // สร้าง/อัปเดต variants ทีละตัว
      for (const variant of variants) {
        if (variant.id) {
          await productsAPI.updateVariant(
            createdProduct.id,
            variant.id,
            variant
          );
        } else {
          await productsAPI.createVariant(createdProduct.id, variant);
        }
      }
      // sync stock: sum stock ของ variants แล้วอัปเดต products.stock
      const sumStock = variants.reduce(
        (sum, v) => sum + Number(v.stock || 0),
        0
      );
      await productsAPI.updateProduct(createdProduct.id, { stock: sumStock });
      toast.success("บันทึก Variants สำเร็จ!");
      setStep(0);
      setCreatedProduct(null);
      setUploadedImages([]);
      setVariants([]);
      reset();
      // โหลด product list ใหม่
      const prods = await productsAPI.getAllProducts();
      setProducts(prods.products || []);
    } catch (error) {
      toast.error("บันทึก Variants ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic Variants Table
  const handleVariantChange = (idx, field, value) => {
    setVariants((prev) => {
      const newArr = [...prev];
      newArr[idx] = { ...newArr[idx], [field]: value };
      return newArr;
    });
  };

  const handleDeleteProduct = async (productId) => {
    setIsLoading(true);
    try {
      const response = await productsAPI.deleteProduct(productId);
      if (response.status === 204) {
        toast.success("ลบสินค้าสำเร็จ!");
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        toast.error("ลบสินค้าไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("ลบสินค้าไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", sku: "", stock: 0 },
    ]);

  const removeVariant = (idx) =>
    setVariants((prev) => prev.filter((_, i) => i !== idx));

  // Stepper UI
  const stepLabels = createdProductHasVariant
    ? ["ข้อมูลหลัก", "อัปโหลดรูป", "จัดการ Variants"]
    : ["ข้อมูลหลัก", "อัปโหลดรูป"];
  const Stepper = () => (
    <div className="flex gap-4 mb-6">
      {stepLabels.map((label, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div
            className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${
              step === idx ? "bg-blue-600" : "bg-gray-400"
            }`}
          >
            {idx + 1}
          </div>
          <span
            className={
              step === idx ? "text-blue-600 font-semibold" : "text-gray-500"
            }
          >
            {label}
          </span>
          {idx < stepLabels.length - 1 && (
            <div className="w-8 h-1 bg-gray-300 rounded" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Stepper />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 0: ข้อมูลหลัก */}
        {step === 0 && (
          <form
            onSubmit={handleSubmit(onSubmitMain)}
            className="bg-white border rounded-2xl shadow-lg p-8 flex flex-col gap-4"
          >
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ชื่อสินค้า
              </label>
              <input
                {...register("name", { required: "กรุณากรอกชื่อสินค้า" })}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-3 py-2"
                placeholder="ชื่อสินค้า"
              />
              {errors.name && (
                <span className="text-red-500 text-xs">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                รายละเอียด
              </label>
              <textarea
                {...register("description", {
                  required: "กรุณากรอกรายละเอียด",
                })}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-3 py-2"
                placeholder="รายละเอียดสินค้า"
              />
              {errors.description && (
                <span className="text-red-500 text-xs">
                  {errors.description.message}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ราคา
                </label>
                <input
                  type="number"
                  {...register("price", { required: "กรุณากรอกราคา" })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-3 py-2"
                  placeholder="ราคา"
                />
                {errors.price && (
                  <span className="text-red-500 text-xs">
                    {errors.price.message}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  หมวดหมู่
                </label>
                <Controller
                  name="categoryId"
                  control={control}
                  rules={{ required: "กรุณาเลือกหมวดหมู่" }}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-3 py-2"
                    >
                      <option value="">เลือกหมวดหมู่</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.categoryId && (
                  <span className="text-red-500 text-xs">
                    {errors.categoryId.message}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                แบรนด์
              </label>
              <Controller
                name="brandId"
                control={control}
                rules={{ required: "กรุณาเลือกแบรนด์" }}
                render={({ field }) => (
                  <select
                    {...field}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-3 py-2"
                  >
                    <option value="">เลือกแบรนด์</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.brandId && (
                <span className="text-red-500 text-xs">
                  {errors.brandId.message}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                สินค้ามี Variant หรือไม่?
              </label>
              <select
                {...register("hasVariant")}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-3 py-2"
                defaultValue={"false"}
              >
                <option value="false">ไม่มี (สินค้าธรรมดา)</option>
                <option value="true">มี (เช่น size, color)</option>
              </select>
            </div>
            {/* ถ้าไม่มี variant ให้กรอก stock ได้ */}
            {(!watch ||
              !watch("hasVariant") ||
              watch("hasVariant") === "false") && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  จำนวนสต็อก
                </label>
                <input
                  type="number"
                  {...register("stock", { required: "กรุณากรอกจำนวนสต็อก" })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-3 py-2"
                  placeholder="จำนวนสต็อก"
                  min={0}
                />
                {errors.stock && (
                  <span className="text-red-500 text-xs">
                    {errors.stock.message}
                  </span>
                )}
              </div>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-base px-5 py-2 rounded-lg shadow transition font-semibold"
              disabled={isLoading}
            >
              <FaPlusCircle /> สร้างสินค้า
            </button>
          </form>
        )}
        {/* Step 1: อัปโหลดรูป */}
        {step === 1 && createdProduct && (
          <div className="bg-white border rounded-2xl shadow-lg p-8 flex flex-col gap-4">
            <ImageUpload
              type="product"
              multiple={true}
              productId={createdProduct.id}
              onUpload={handleImagesUploaded}
            />
            <div className="flex gap-2 mt-2">
              {uploadedImages.map((img, idx) => (
                <span key={idx}>{img}</span>
              ))}
            </div>
            {/* ถ้าไม่มี variant ให้ปุ่มเสร็จสิ้น, ถ้ามี variant ให้ปุ่มข้ามไปเพิ่ม Variants */}
            {createdProductHasVariant ? (
              <button
                onClick={() => setStep(2)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                ข้ามไปเพิ่ม Variants
              </button>
            ) : (
              <button
                onClick={async () => {
                  toast.success("เพิ่มสินค้าเสร็จสมบูรณ์!");
                  setStep(0);
                  setCreatedProduct(null);
                  setUploadedImages([]);
                  setVariants([]);
                  reset();
                  setIsLoading(true);
                  const prods = await productsAPI.getAllProducts();
                  setProducts(prods.products || []);
                  setIsLoading(false);
                }}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
              >
                เสร็จสิ้น
              </button>
            )}
          </div>
        )}
        {/* Step 2: Variants Table */}
        {step === 2 && createdProduct && createdProductHasVariant && (
          <div className="bg-white border rounded-2xl shadow-lg p-8 flex flex-col gap-4">
            <h3 className="text-lg font-semibold mb-2">Variants</h3>
            <table className="w-full border mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Size</th>
                  <th className="p-2">Color</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, idx) => (
                  <tr key={idx} className="border-b">
                    <td>
                      <input
                        value={variant.size}
                        onChange={(e) =>
                          handleVariantChange(idx, "size", e.target.value)
                        }
                        className="w-20 border rounded px-2 py-1"
                      />
                    </td>
                    <td>
                      <input
                        value={variant.color}
                        onChange={(e) =>
                          handleVariantChange(idx, "color", e.target.value)
                        }
                        className="w-24 border rounded px-2 py-1"
                      />
                    </td>
                    <td>
                      <input
                        value={variant.sku}
                        onChange={(e) =>
                          handleVariantChange(idx, "sku", e.target.value)
                        }
                        className="w-28 border rounded px-2 py-1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={variant.stock}
                        min={0}
                        onChange={(e) =>
                          handleVariantChange(
                            idx,
                            "stock",
                            Number(e.target.value)
                          )
                        }
                        className="w-16 border rounded px-2 py-1"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => removeVariant(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaMinus />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={addVariant}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
            >
              <FaPlus /> เพิ่ม Variant
            </button>
            <button
              onClick={handleSaveVariants}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold"
              disabled={isLoading}
            >
              บันทึก Variants
            </button>
          </div>
        )}
        {/* Product List (เหมือนเดิม) */}
        <div className="bg-white border rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-2 mb-4">
            <FaBoxOpen className="text-blue-500 text-2xl" />
            <h2 className="text-xl font-bold text-gray-800">Products List</h2>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between border-b pb-3 gap-4"
              >
                <div className="flex items-center gap-3 flex-1">
                  {product.imageUrl && product.imageUrl.length > 0 ? (
                    <img
                      src={product.imageUrl[0]}
                      alt={product.name}
                      className="w-14 h-14 rounded-lg object-cover border"
                    />
                  ) : (
                    <FaImage className="w-14 h-14 text-gray-300" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {product.name}
                      {"isActive" in product ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            product.isActive
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {product.isActive ? (
                            <FaCheckCircle className="inline mr-1 text-green-500" />
                          ) : (
                            <FaTimesCircle className="inline mr-1 text-gray-400" />
                          )}
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {product.description}
                    </p>
                    <div className="flex gap-2 mt-1 text-xs text-gray-500">
                      <span>
                        Brand:{" "}
                        {product.brandId
                          ? brands.find((b) => b.id === product.brandId)
                              ?.name || "-"
                          : "-"}
                      </span>
                      <span>
                        Category:{" "}
                        {product.categoryId
                          ? categories.find((c) => c.id === product.categoryId)
                              ?.name || "-"
                          : "-"}
                      </span>
                      <span>Stock: {product.stock}</span>
                      <span>
                        {Array.isArray(product.variants) &&
                        product.variants.length > 0
                          ? `Variants: ${product.variants.length}`
                          : "สินค้าธรรมดา"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <button
                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                    onClick={() => {
                      setEditingId(product.id);
                    }}
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    className="flex items-center gap-1 text-red-600 hover:underline text-sm font-medium"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FaBoxOpen className="text-5xl mb-2" />
                <p className="text-base">No products found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
