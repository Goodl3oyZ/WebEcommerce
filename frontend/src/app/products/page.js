"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react"; // Fragment added
import Link from "next/link";
import { productsAPI } from "@/lib/api/products";
import { categoriesAPI } from "@/lib/api/categories";
import { checkServerConnection } from "@/lib/api/axiosInstance";
import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import PriceFilter from "@/components/PriceFilter";
import SortFilter from "@/components/SortFilter";
import Pagination from "@/components/Pagination";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import {
  FiFilter,
  FiX,
  FiRefreshCw,
  FiChevronRight,
  FiGrid,
  FiList,
} from "react-icons/fi"; // Added more icons if needed
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/ui/Button";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState("checking");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    sort: "createdAt",
    order: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Check server connection on initial load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkServerConnection();
        setServerStatus(isConnected ? "connected" : "disconnected");
      } catch (error) {
        setServerStatus("disconnected");
      }
    };
    checkConnection();
  }, []);

  const fetchData = useCallback(async () => {
    if (serverStatus === "disconnected") {
      setError("Server is not running. Please start the server and try again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [productsData, categoriesData] = await Promise.all([
        productsAPI.getAllProducts({
          page: pagination.page,
          limit: pagination.limit,
          ...filters,
        }),
        categoriesAPI.getAllCategories(),
      ]);

      setProducts(productsData.products);
      setPagination((prev) => ({
        ...prev,
        // Ensure that productsData.pagination exists and has these properties
        // Provide fallbacks in case the API response structure is inconsistent
        total:
          productsData.pagination?.total !== undefined
            ? productsData.pagination.total
            : 0,
        page: parseInt(productsData.pagination?.page || "1", 10), // Default to '1' if undefined
        limit: parseInt(productsData.pagination?.limit || "12", 10), // Default to '12' if undefined
      }));
      setCategories(categoriesData.categories || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "Failed to fetch data. Please try again.");
      setProducts([]);
      setPagination((prev) => ({ ...prev, total: 0, page: 1, limit: 12 }));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, serverStatus]);

  useEffect(() => {
    if (serverStatus !== "checking") {
      fetchData();
    }
  }, [fetchData, serverStatus]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleRetry = useCallback(async () => {
    setServerStatus("checking");
    const isConnected = await checkServerConnection();
    setServerStatus(isConnected ? "connected" : "disconnected");
    if (isConnected) {
      fetchData();
    }
  }, [fetchData]);

  const resetFilters = useCallback(() => {
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      sort: "createdAt",
      order: "desc",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    return count;
  }, [filters.category, filters.minPrice, filters.maxPrice]);

  // Search products (autocomplete)
  useEffect(() => {
    if (!search) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    let active = true;
    setSearchLoading(true);
    productsAPI
      .searchProducts(search, { limit: 8 })
      .then((res) => {
        if (active) {
          setSearchResults(res.products || []);
          setShowDropdown(true);
        }
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
    return () => {
      active = false;
    };
  }, [search]);

  // --- Initial Loading / Error States ---
  if (loading && products.length === 0 && serverStatus === "checking") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-indigo-100">
        <LoadingSpinner size="large" className="text-indigo-600" />
        <p className="mt-4 text-lg font-medium text-gray-700">
          กำลังเชื่อมต่อและโหลดสินค้า...
        </p>
      </div>
    );
  }

  if (error || serverStatus === "disconnected") {
    return (
      <ErrorState
        title={
          serverStatus === "disconnected"
            ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
            : "เกิดข้อผิดพลาดในการโหลดสินค้า"
        }
        message={
          serverStatus === "disconnected"
            ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบให้แน่ใจว่าเซิร์ฟเวอร์ทำงานอยู่ และลองใหม่อีกครั้ง"
            : error
        }
        actionText="ลองอีกครั้ง"
        onAction={handleRetry}
      />
    );
  }

  // Calculate start and end indices for display message
  const startIndex = Math.min(
    pagination.limit * (pagination.page - 1) + 1,
    pagination.total
  );
  const endIndex = Math.min(
    pagination.limit * pagination.page,
    pagination.total
  );
  const displayRange =
    pagination.total === 0 ? "0" : `${startIndex} - ${endIndex}`;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 md:py-8">
        {/* /* Search Bar + Filters (compact, sidebar only) */}
        <div className="flex justify-center mb-4 gap-1">
          <div className="w-full max-w-md relative">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow px-2 py-1  focus-within:ring-2 focus-within:ring-indigo-400">
              <span className="text-gray-400 mr-1">
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="w-full border-0 outline-none text-base bg-transparent placeholder-gray-400 px-1 py-0.5"
                placeholder="ค้นหาสินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                style={{ minHeight: 32 }}
              />
              <button
                className="ml-1 px-2 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition text-sm"
                onClick={() => search && setShowDropdown(true)}
                tabIndex={-1}
                style={{ minHeight: 28 }}
              >
                ค้นหา
              </button>
            </div>
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-30 max-h-72 overflow-y-auto text-sm">
                {searchLoading && (
                  <div className="px-4 py-3 text-gray-400">กำลังค้นหา...</div>
                )}
                {searchResults.length === 0 && !searchLoading && (
                  <div className="px-4 py-3 text-gray-400">ไม่พบสินค้า</div>
                )}
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 cursor-pointer transition"
                    onMouseDown={() => {
                      setShowDropdown(false);
                      setSearch("");
                      window.location.href = `/products/${item.id}`;
                    }}
                  >
                    <img
                      src={
                        Array.isArray(item.imageUrl)
                          ? item.imageUrl[0]
                          : item.imageUrl || "/images/placeholder.svg"
                      }
                      alt={item.name}
                      className="w-8 h-8 object-cover rounded border"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 truncate text-sm">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {item.brand || item.categoryName}
                      </span>
                    </div>
                    <span className="ml-auto text-blue-600 font-bold text-xs">
                      ฿{item.price}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Breadcrumbs */}
        <nav className="flex mb-3" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm md:text-base text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-700 transition-colors">
                หน้าแรก
              </Link>
            </li>
            <li>
              <FiChevronRight className="h-4 w-4 text-gray-400" />
            </li>
            <li>
              <span className="font-semibold text-gray-800">สินค้าทั้งหมด</span>
            </li>
          </ol>
        </nav>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
          {/* Sidebar filters only (no filter bar above grid) */}
          <div className="hidden md:block md:col-span-1">
            <div className="bg-white p-5 rounded-xl shadow border border-gray-100 sticky top-8 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  ตัวกรอง
                </h2>
                {activeFilterCount > 0 && (
                  <Button
                    onClick={resetFilters}
                    variant="ghost"
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 p-1 rounded-md hover:bg-gray-50 transition-colors duration-200"
                    aria-label="รีเซ็ตตัวกรองทั้งหมด"
                  >
                    <FiRefreshCw className="h-3 w-3" />
                    <span>รีเซ็ต</span>
                  </Button>
                )}
              </div>
              <div className="space-y-5">
                <CategoryFilter
                  categories={categories}
                  selectedCategory={filters.category}
                  onCategoryChange={(category) =>
                    handleFilterChange({ category })
                  }
                  titleClassName="text-sm font-semibold text-gray-700 mb-1"
                  itemClassName="text-sm"
                />
                <hr className="border-gray-200" />
                <PriceFilter
                  minPrice={filters.minPrice}
                  maxPrice={filters.maxPrice}
                  onPriceChange={(min, max) =>
                    handleFilterChange({ minPrice: min, maxPrice: max })
                  }
                  titleClassName="text-sm font-semibold text-gray-700 mb-1"
                  inputClassName="text-sm px-2 py-1 rounded border border-gray-200 w-20"
                />
                <SortFilter
                  value={filters.sort}
                  onChange={(sort) => handleFilterChange({ sort })}
                  className="mt-2"
                  titleClassName="text-sm font-semibold text-gray-700 mb-1"
                  selectClassName="text-sm px-2 py-1 rounded border border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Product grid and controls */}
          <div className="md:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <p className="text-sm text-gray-700">
                แสดงผลสินค้า
                <span className="font-semibold text-gray-800">
                  {" "}
                  {displayRange}{" "}
                </span>
                จากทั้งหมด
                <span className="font-semibold text-gray-900">
                  {" "}
                  {pagination.total.toLocaleString("th-TH")}{" "}
                </span>
                รายการ
              </p>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1 mb-4 p-2 bg-white rounded-xl shadow border border-gray-100 text-xs">
                <span className="text-xs text-gray-600 font-medium mr-1">
                  ตัวกรองที่ใช้งาน:
                </span>
                {filters.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200">
                    {categories.find((c) => c.id === filters.category)?.name ||
                      filters.category}
                    <button
                      onClick={() => handleFilterChange({ category: "" })}
                      className="ml-1 h-3 w-3 text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full"
                      aria-label="ลบตัวกรองหมวดหมู่"
                    >
                      <FiX className="h-full w-full" />
                    </button>
                  </span>
                )}
                {filters.minPrice && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-1 ring-green-200">
                    ราคาต่ำสุด:{" "}
                    {parseFloat(filters.minPrice).toLocaleString("th-TH")}
                    <button
                      onClick={() => handleFilterChange({ minPrice: "" })}
                      className="ml-1 h-3 w-3 text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-full"
                      aria-label="ลบตัวกรองราคาต่ำสุด"
                    >
                      <FiX className="h-full w-full" />
                    </button>
                  </span>
                )}
                {filters.maxPrice && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-1 ring-green-200">
                    ราคาสูงสุด:{" "}
                    {parseFloat(filters.maxPrice).toLocaleString("th-TH")}
                    <button
                      onClick={() => handleFilterChange({ maxPrice: "" })}
                      className="ml-1 h-3 w-3 text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-full"
                      aria-label="ลบตัวกรองราคาสูงสุด"
                    >
                      <FiX className="h-full w-full" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Product Grid or Empty State */}
            {products.length === 0 && !loading ? (
              <EmptyState
                title="ไม่พบสินค้า"
                description="ลองปรับตัวกรองของคุณ หรือรีเซ็ตตัวกรองทั้งหมด"
                actionText="รีเซ็ตตัวกรอง"
                onAction={resetFilters}
              />
            ) : (
              <>
                <ProductGrid products={products} loading={loading} />
                <div className="mt-6 flex justify-center">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={Math.ceil(pagination.total / pagination.limit)}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Mobile Filters Dialog (using Headless UI Dialog for better accessibility/control) */}
      <Transition appear show={mobileFiltersOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 md:hidden"
          onClose={() => setMobileFiltersOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-40" />{" "}
            {/* Darker overlay */}
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-col overflow-y-auto bg-white pb-12 shadow-xl">
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                  <Dialog.Title className="text-2xl font-semibold text-gray-900">
                    ตัวกรอง
                  </Dialog.Title>
                  <button
                    type="button"
                    className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:text-gray-500"
                    onClick={() => setMobileFiltersOpen(false)}
                    aria-label="ปิดเมนูตัวกรอง"
                  >
                    <FiX className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="p-4 space-y-8 flex-grow">
                  <CategoryFilter
                    categories={categories}
                    selectedCategory={filters.category}
                    onCategoryChange={(category) =>
                      handleFilterChange({ category })
                    }
                  />
                  <PriceFilter
                    minPrice={filters.minPrice}
                    maxPrice={filters.maxPrice}
                    onPriceChange={(min, max) =>
                      handleFilterChange({ minPrice: min, maxPrice: max })
                    }
                  />
                </div>

                <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md">
                  <Button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors duration-200"
                  >
                    แสดงผลลัพธ์ ({pagination.total})
                  </Button>
                  {activeFilterCount > 0 && (
                    <Button
                      onClick={resetFilters}
                      variant="ghost"
                      className="w-full mt-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                    >
                      รีเซ็ตตัวกรอง
                    </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

// Product Grid Component
function ProductGrid({ products, loading }) {
  const showSkeleton = loading && products.length === 0;

  return (
    <div className="relative">
      {/* Overlay for "soft" loading state when filters change */}
      {loading && products.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
          <LoadingSpinner size="medium" className="text-indigo-600" />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4  gap-3 md:gap-4">
        {showSkeleton
          ? Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))
          : products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
    </div>
  );
}

// --- Skeleton Component (compact version) ---
const ProductCardSkeleton = () => (
  <div className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm animate-pulse p-2 min-h-[270px]">
    <div className="aspect-[4/5] bg-gray-200 w-full rounded-md"></div>
    <div className="mt-2 space-y-2 flex-grow">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      <div className="h-8 bg-gray-200 rounded w-full mt-2"></div>
    </div>
  </div>
);
