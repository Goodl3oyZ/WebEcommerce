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
  // แปลงให้ imageUrl เป็น array เสมอ
  const imageUrls = product?.imageUrl
    ? Array.isArray(product.imageUrl)
      ? product.imageUrl
      : [product.imageUrl]
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
        ? product.imageUrl[0]
        : product.imageUrl,
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

  // Layout
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

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-2 py-10">
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
          <div className="md:w-3/5 flex flex-col items-center">
            <div className="relative w-full aspect-[12/10] bg-gray-100 rounded-2xl border border-gray-100 shadow overflow-hidden flex items-center justify-center max-w-xl mx-auto">
              <Image
                src={imageUrls[galleryIdx] || "/images/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover cursor-zoom-in transition-all duration-300"
                sizes="(max-width: 768px) 100vw, 600px"
                onClick={() => setZoomedImg(imageUrls[galleryIdx])}
                priority
              />
              {/* BADGES */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
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
                    OUT
                  </span>
                )}
              </div>
              {/* IMAGE COUNT INDICATOR */}
              {imageUrls.length > 1 && (
                <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] rounded-full px-2 py-0.5 z-10">
                  {galleryIdx + 1} / {imageUrls.length}
                </span>
              )}
              {/* ปุ่มเลื่อน */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white"
                    onClick={() =>
                      setGalleryIdx(
                        (galleryIdx - 1 + imageUrls.length) % imageUrls.length
                      )
                    }
                  >
                    <FiChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white"
                    onClick={() =>
                      setGalleryIdx((galleryIdx + 1) % imageUrls.length)
                    }
                  >
                    <FiChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {imageUrls.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center">
                {imageUrls.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={product.name + " thumb"}
                    className={`w-10 h-10 object-cover rounded border-2 cursor-pointer transition-all duration-200 ${
                      galleryIdx === idx
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-blue-400"
                    }`}
                    onClick={() => setGalleryIdx(idx)}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Product Info */}
          <div className="md:w-2/5 flex flex-col gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <div className="flex flex-wrap gap-2 mb-2">
                {product.brand && (
                  <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5 font-medium">
                    {product.brand.name || product.brand}
                  </span>
                )}
                {product.category && (
                  <span className="text-xs bg-purple-100 text-purple-700 rounded px-2 py-0.5 font-medium">
                    {product.category.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-blue-700">
                  ฿{product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through">
                    ฿{product.originalPrice}
                  </span>
                )}
                <span className="ml-4 text-sm text-gray-500">
                  {product.stock > 0 ? (
                    <span className="text-green-600 font-semibold">
                      In Stock
                    </span>
                  ) : (
                    <span className="text-red-600 font-semibold">
                      Out of Stock
                    </span>
                  )}
                </span>
                {/* คะแนนรีวิว */}
                <span className="ml-4 flex items-center gap-1 text-sm text-gray-700">
                  <FiStar className="text-yellow-400" />
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
            <div className="text-gray-700 text-lg leading-relaxed mb-2">
              {product.description}
            </div>
            {/* Variant Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-900">
                  เลือกตัวเลือกสินค้า
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                        selectedVariant?.id === variant.id
                          ? "border-blue-500 bg-blue-50 shadow"
                          : "border-gray-200 hover:border-blue-300"
                      } ${
                        variant.stock === 0
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={variant.stock === 0}
                    >
                      {variant.color}{" "}
                      {variant.size && (
                        <span className="ml-1 text-gray-500">
                          {variant.size}
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
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
                  disabled={quantity <= 1}
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
                  disabled={
                    selectedVariant
                      ? selectedVariant.stock === 0
                      : product.stock === 0
                  }
                />
                <button
                  onClick={() => {
                    const maxStock = selectedVariant
                      ? selectedVariant.stock
                      : product.stock;
                    setQuantity(Math.min(maxStock, quantity + 1));
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
                  disabled={
                    quantity >=
                    (selectedVariant ? selectedVariant.stock : product.stock)
                  }
                >
                  +
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={
                  selectedVariant
                    ? selectedVariant.stock === 0
                    : product.stock === 0
                }
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <FiShoppingCart className="mr-2" /> เพิ่มลงตะกร้า
              </Button>
            </div>
          </div>
        </div>
        {/* รีวิวสินค้า */}
        <div className="max-w-3xl mx-auto mt-10">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl font-bold text-yellow-500 flex items-center">
              <FiStar className="mr-1" /> {averageRating}
            </span>
            <span className="text-gray-600">({reviews.length} รีวิว)</span>
            {/* Bar chart summary (mock) */}
            <div className="flex gap-1 ml-6">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">{star}</span>
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div
                      className="h-2 rounded bg-yellow-400"
                      style={{
                        width: `${Math.round(
                          (100 *
                            reviews.filter((r) => r.rating === star).length) /
                            (reviews.length || 1)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                ยังไม่มีรีวิว
              </div>
            ) : (
              <>
                {paginatedReviews.map((review, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow p-4 border border-gray-100"
                  >
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm font-semibold text-gray-700">
                        {review.userName || "Anonymous"}
                      </span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-xs text-gray-500">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <ReviewComment comment={review.comment} />
                  </div>
                ))}
                {totalReviewPages > 1 && (
                  <Pagination
                    currentPage={reviewPage}
                    totalPages={totalReviewPages}
                    onPageChange={setReviewPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {/* Divider */}
        <div className="my-16 border-t border-gray-200" />
        {/* Related & Recently Viewed */}
        {(relatedProducts.length > 0 || recentlyViewed.length > 0) && (
          <div className="max-w-6xl mx-auto my-16">
            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    สินค้าที่เกี่ยวข้อง
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                  {relatedProducts.slice(0, 8).map((item) => (
                    <ProductCard key={item.id} product={item} />
                  ))}
                </div>
              </div>
            )}
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    สินค้าที่ดูล่าสุด
                  </h3>
                </div>
                <div className="grid  grid-cols-2 sm:grid-cols-3 md:grid-cols-5  gap-6">
                  {recentlyViewed.slice(0, 8).map((item) => {
                    const imgArr = Array.isArray(item.imageUrl)
                      ? item.imageUrl
                      : item.imageUrl
                      ? [item.imageUrl]
                      : ["/images/placeholder.svg"];
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
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setZoomedImg(null)}
          >
            <button
              className="absolute top-6 right-8 z-50 text-white text-3xl font-bold bg-black/40 rounded-full p-2 hover:bg-black/70 transition"
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
              alt="Zoomed"
              className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-2xl border-4 border-white bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </Dialog>
      )}
      {/* Sticky Add to Cart (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 border-t border-gray-200 px-4 py-3 flex items-center gap-4 shadow-2xl">
        <span className="text-xl font-bold text-blue-700">
          ฿{product.price}
        </span>
        <Button
          onClick={handleAddToCart}
          disabled={
            selectedVariant ? selectedVariant.stock === 0 : product.stock === 0
          }
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <FiShoppingCart className="mr-2" /> เพิ่มลงตะกร้า
        </Button>
      </div>
    </div>
  );
}
