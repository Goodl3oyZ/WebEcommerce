"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { productsAPI } from "@/lib/api/products";
import useCartStore from "@/store/cartStore";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import ProductCard from "@/components/ProductCard";
import {
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiShoppingCart,
} from "react-icons/fi";
import Pagination from "@/components/Pagination";
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import ProductImage from "@/components/ui/ProductImage";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [zoomedImg, setZoomedImg] = useState(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const searchInputRef = useRef();
  const addToCart = useCartStore((state) => state.addItem);
  // แปลงให้ imageUrl เป็น array และกรอง empty string ออก
  const imageUrls = product?.imageUrl
    ? (Array.isArray(product.imageUrl)
        ? product.imageUrl
        : [product.imageUrl]
      ).filter((u) => u && typeof u === "string" && u.trim() !== "")
    : [];

  // Rating summary
  const reviews = product?.reviews || [];
  const averageRating = reviews.length
    ? (
        reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      ).toFixed(1)
    : "0.0";

  // Pagination for reviews
  const [reviewPage, setReviewPage] = useState(1);
  const reviewsPerPage = 5;
  const totalReviewPages = Math.ceil(reviews.length / reviewsPerPage);
  const paginatedReviews = reviews.slice(
    (reviewPage - 1) * reviewsPerPage,
    reviewPage * reviewsPerPage
  );

  // ReviewComment component (inline)
  function ReviewComment({ comment }) {
    const [expanded, setExpanded] = useState(false);
    const maxLength = 120;
    if (!comment) return null;
    const isLong = comment.length > maxLength;
    const displayText = expanded ? comment : comment.slice(0, maxLength);
    return (
      <div className="text-gray-700 text-sm whitespace-pre-line">
        {displayText}
        {isLong && (
          <button
            className="ml-2 text-blue-500 underline text-xs"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "ย่อ" : "อ่านเพิ่มเติม"}
          </button>
        )}
      </div>
    );
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productsAPI.getProductById(id);
        if (!data) {
          setError("Product not found");
          return;
        }
        setProduct(data);
      } catch (err) {
        setError(err.message || "Failed to fetch product details");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  // Fetch related
  useEffect(() => {
    if (!product) return;
    const fetchRelated = async () => {
      try {
        let res;
        if (product.categoryId) {
          res = await productsAPI.getProductsByCategory(product.categoryId, {
            limit: 8,
          });
        } else {
          res = await productsAPI.getAllProducts({ limit: 8 });
        }
        setRelatedProducts(
          (res.products || []).filter((p) => p.id !== product.id)
        );
      } catch {
        setRelatedProducts([]);
      }
    };
    fetchRelated();
  }, [product]);

  // Recently viewed
  useEffect(() => {
    if (!product) return;
    const key = "recentlyViewedProducts";
    let viewed = [];
    try {
      viewed = JSON.parse(localStorage.getItem(key)) || [];
    } catch {}
    viewed = viewed.filter((p) => p.id !== product.id);
    viewed.unshift({
      id: product.id,
      name: product.name,
      imageUrl: Array.isArray(product.imageUrl)
        ? product.imageUrl.find((u) => u && u.trim() !== "") || null
        : product.imageUrl || null,
      price: product.price,
      brand: product.brand,
      category: product.category,
    });
    if (viewed.length > 8) viewed = viewed.slice(0, 8);
    localStorage.setItem(key, JSON.stringify(viewed));
    setRecentlyViewed(viewed.filter((p) => p.id !== product.id));
  }, [product]);

  // Add to cart
  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: imageUrls[0] || "/images/placeholder.svg",
      quantity: quantity,
      variantId: selectedVariant?.id,
      variant: selectedVariant,
      variantName: selectedVariant
        ? `${selectedVariant.color} - ${selectedVariant.size}`
        : null,
    });
    toast.success("Added to cart!");
  };

  // Nothing below can render until the product has loaded (all hooks are above).
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          {error || "Product not found"}
        </h2>
        <Button onClick={() => router.push("/products")}>
          Back to Products
        </Button>
      </div>
    );
  }

  // Button states
  const isOutOfStock = selectedVariant
    ? selectedVariant.stock <= 0
    : product.stock <= 0 || product.stock == null;
  const isUnpriced = !product.price || Number(product.price) <= 0;
  const isButtonDisabled = isOutOfStock || isUnpriced;

  const getButtonText = () => {
    if (isOutOfStock) return "สินค้าหมด (Out of Stock)";
    if (isUnpriced) return "ยังไม่เปิดขาย / ไม่ระบุราคา";
    return "เพิ่มลงตะกร้า";
  };

  const formattedPrice = isUnpriced
    ? "ยังไม่กำหนดราคา"
    : `฿${Number(product.price).toLocaleString("th-TH")}`;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Back Button */}
        <button
          className="flex items-center gap-2 text-gray-600 hover:text-blue-700 text-sm font-medium mb-6 transition-colors"
          onClick={() => router.push("/products")}
        >
          <FiChevronLeft className="w-5 h-5" />
          กลับไปหน้าสินค้า
        </button>
        {/* Main Product Section */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Gallery */}
          <div className="md:w-1/2 flex flex-col items-center">
            <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-2xl border border-gray-100 shadow overflow-hidden flex items-center justify-center max-w-xl mx-auto">
              <ProductImage
                imageUrl={imageUrls[galleryIdx]}
                alt={product.name}
                fill
                className="object-cover cursor-zoom-in transition-all duration-300"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              {/* Overlay click target for zoom */}
              {imageUrls[galleryIdx] && (
                <div
                  className="absolute inset-0 z-10 cursor-zoom-in"
                  onClick={() => setZoomedImg(imageUrls[galleryIdx])}
                  title="คลิกเพื่อขยายภาพ"
                />
              )}
              {/* BADGES */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
                {product.createdAt &&
                  Date.now() - new Date(product.createdAt).getTime() <
                    1000 * 60 * 60 * 24 * 7 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      NEW
                    </span>
                  )}
                {product.stock < 20 && product.stock > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    HOT
                  </span>
                )}
                {product.stock === 0 && (
                  <span className="bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    OUT OF STOCK
                  </span>
                )}
              </div>
              {/* IMAGE COUNT INDICATOR */}
              {imageUrls.length > 1 && (
                <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] rounded-full px-2 py-0.5 z-20 pointer-events-none">
                  {galleryIdx + 1} / {imageUrls.length}
                </span>
              )}
              {/* ปุ่มเลื่อน */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white z-20 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIdx(
                        (galleryIdx - 1 + imageUrls.length) % imageUrls.length
                      );
                    }}
                  >
                    <FiChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white z-20 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIdx((galleryIdx + 1) % imageUrls.length);
                    }}
                  >
                    <FiChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {imageUrls.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center flex-wrap">
                {imageUrls.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative w-12 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
                      galleryIdx === idx
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-blue-400"
                    }`}
                    onClick={() => setGalleryIdx(idx)}
                  >
                    <ProductImage
                      imageUrl={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="md:w-1/2 flex flex-col gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                {product.name}
              </h1>
              <div className="flex flex-wrap gap-2 mb-3">
                {product.brand && (
                  <span className="text-xs bg-blue-100 text-blue-700 rounded px-2.5 py-1 font-medium">
                    {product.brand.name || product.brand}
                  </span>
                )}
                {product.category && (
                  <span className="text-xs bg-purple-100 text-purple-700 rounded px-2.5 py-1 font-medium">
                    {product.category.name}
                  </span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-4 mb-2">
                <span className="text-3xl font-extrabold text-blue-700">
                  {formattedPrice}
                </span>
                {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <span className="text-lg text-gray-400 line-through">
                    ฿{Number(product.originalPrice).toLocaleString("th-TH")}
                  </span>
                )}
                <span className="text-sm">
                  {isOutOfStock ? (
                    <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                      In Stock ({selectedVariant ? selectedVariant.stock : product.stock} ชิ้น)
                    </span>
                  )}
                </span>
                {/* คะแนนรีวิว */}
                <span className="flex items-center gap-1 text-sm text-gray-700">
                  <FiStar className="text-yellow-400 fill-yellow-400" />
                  {reviews.length > 0 ? (
                    <>
                      <span className="font-semibold">{averageRating}</span>
                      <span className="text-gray-500">
                        ({reviews.length} รีวิว)
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">ยังไม่มีรีวิว</span>
                  )}
                </span>
              </div>
            </div>

            {/* Rich Text Description */}
            <div className="border-t border-b border-gray-100 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                รายละเอียดสินค้า
              </h3>
              <div
                className="prose prose-blue max-w-none text-gray-700 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(product.description || "<p>ไม่มีรายละเอียดสินค้า</p>"),
                }}
              />
            </div>

            {/* Variant Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  เลือกตัวเลือกสินค้า
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                        selectedVariant?.id === variant.id
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-blue-300"
                      } ${
                        variant.stock === 0
                          ? "opacity-50 cursor-not-allowed line-through"
                          : ""
                      }`}
                      disabled={variant.stock === 0}
                    >
                      {variant.color}{" "}
                      {variant.size && (
                        <span className="ml-1 text-gray-500">
                          ({variant.size})
                        </span>
                      )}
                      <span className="ml-2 text-xs">
                        {variant.stock > 0 ? `${variant.stock} ชิ้น` : "หมด"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-2">
              <div className="flex items-center border border-gray-300 rounded-lg justify-between sm:justify-start">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg disabled:opacity-40"
                  disabled={quantity <= 1 || isButtonDisabled}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedVariant ? selectedVariant.stock : product.stock}
                  value={quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    const maxStock = selectedVariant
                      ? selectedVariant.stock
                      : product.stock;
                    if (value > 0 && value <= maxStock) setQuantity(value);
                  }}
                  className="w-16 text-center border-x border-gray-300 py-2 focus:outline-none"
                  disabled={isButtonDisabled}
                />
                <button
                  onClick={() => {
                    const maxStock = selectedVariant
                      ? selectedVariant.stock
                      : product.stock;
                    setQuantity(Math.min(maxStock, quantity + 1));
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg disabled:opacity-40"
                  disabled={
                    isButtonDisabled ||
                    quantity >=
                      (selectedVariant ? selectedVariant.stock : product.stock)
                  }
                >
                  +
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={isButtonDisabled}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-base shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center"
              >
                <FiShoppingCart className="mr-2 w-5 h-5" />
                {getButtonText()}
              </Button>
            </div>
          </div>
        </div>

        {/* รีวิวสินค้า */}
        <div className="max-w-4xl mx-auto mt-16 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            รีวิวและคะแนนสินค้า
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 bg-blue-50/50 p-4 rounded-xl">
            <div className="flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-blue-700 flex items-center">
                {averageRating}
              </span>
              <div className="flex items-center mt-1">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(Number(averageRating))
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 mt-1">
                จาก {reviews.length} รีวิว
              </span>
            </div>
            {/* Bar chart summary */}
            <div className="flex-1 w-full space-y-1.5 border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-6">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => r.rating === star).length;
                const percentage = reviews.length
                  ? Math.round((100 * count) / reviews.length)
                  : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-gray-600 font-medium">{star} ดาว</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-gray-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                ยังไม่มีรีวิวสำหรับสินค้านี้
              </div>
            ) : (
              <>
                {paginatedReviews.map((review, index) => (
                  <div
                    key={index}
                    className="bg-gray-50/70 rounded-xl p-4 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {review.user?.name || "ผู้ใช้งาน"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString("th-TH")
                          : "-"}
                      </span>
                    </div>
                    <ReviewComment comment={review.comment} />
                  </div>
                ))}
                {totalReviewPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={reviewPage}
                      totalPages={totalReviewPages}
                      onPageChange={setReviewPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-16 border-t border-gray-200" />

        {/* Related & Recently Viewed */}
        {(relatedProducts.length > 0 || recentlyViewed.length > 0) && (
          <div className="max-w-7xl mx-auto space-y-12">
            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  สินค้าที่เกี่ยวข้อง
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  {relatedProducts.slice(0, 4).map((item) => (
                    <ProductCard key={item.id} product={item} />
                  ))}
                </div>
              </div>
            )}
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  สินค้าที่ดูล่าสุด
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  {recentlyViewed.slice(0, 4).map((item) => {
                    const imgArr = Array.isArray(item.imageUrl)
                      ? item.imageUrl
                      : item.imageUrl
                      ? [item.imageUrl]
                      : [];
                    return (
                      <ProductCard
                        key={item.id}
                        product={{ ...item, imageUrl: imgArr }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zoomed Image Dialog */}
      {zoomedImg && (
        <Dialog open={!!zoomedImg} onClose={() => setZoomedImg(null)}>
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4"
            onClick={() => setZoomedImg(null)}
          >
            <button
              className="absolute top-6 right-6 z-50 text-white text-3xl font-bold bg-black/40 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition"
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImg(null);
              }}
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={zoomedImg}
              alt="Zoomed product"
              className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl border border-white/20 bg-white object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </Dialog>
      )}

      {/* Sticky Add to Cart (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 flex items-center gap-4 shadow-2xl">
        <span className="text-lg font-bold text-blue-700 truncate">
          {formattedPrice}
        </span>
        <Button
          onClick={handleAddToCart}
          disabled={isButtonDisabled}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <FiShoppingCart className="mr-1.5 w-4 h-4 inline" />
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
}

