"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaImage,
} from "react-icons/fa";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import EmptyState from "@/components/EmptyState";
import { resolveProductImageUrl } from "@/lib/images";

export default function ProductTable({
  products = [],
  categories = [],
  brands = [],
  onEdit,
  onDelete,
  onView,
  isLoading = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || product.categoryId == selectedCategory;
      const matchesBrand = !selectedBrand || product.brandId == selectedBrand;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && product.isActive) ||
        (statusFilter === "inactive" && !product.isActive);

      return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedBrand, statusFilter]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested objects
      if (sortField === "category") {
        aValue = categories.find((cat) => cat.id == a.categoryId)?.name || "";
        bValue = categories.find((cat) => cat.id == b.categoryId)?.name || "";
      } else if (sortField === "brand") {
        aValue = brands.find((brand) => brand.id == a.brandId)?.name || "";
        bValue = brands.find((brand) => brand.id == b.brandId)?.name || "";
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredProducts, sortField, sortDirection, categories, brands]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedBrand("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort className="text-fg-subtle" />;
    return sortDirection === "asc" ? (
      <FaSortUp className="text-fg" />
    ) : (
      <FaSortDown className="text-fg" />
    );
  };

  if (isLoading) {
    return <PanelSkeleton rows={8} />;
  }

  return (
    <div className="bg-surface rounded-xl shadow-lg overflow-hidden">
      {/* Header with Title and Results Summary */}
      <div className="px-6 py-4 bg-gradient-to-r from-surface-muted to-surface-muted border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-fg">
              รายการสินค้า
            </h2>
            <p className="text-sm text-fg-muted mt-1">
              แสดง {startIndex + 1}-
              {Math.min(startIndex + itemsPerPage, sortedProducts.length)} จาก{" "}
              {sortedProducts.length} รายการ
              {(searchTerm ||
                selectedCategory ||
                selectedBrand ||
                statusFilter) && (
                <span className="ml-2 text-fg font-medium">
                  (กรองแล้ว)
                </span>
              )}
            </p>
          </div>
          {(searchTerm ||
            selectedCategory ||
            selectedBrand ||
            statusFilter) && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border text-fg rounded-lg hover:bg-surface-muted transition-colors text-sm font-medium shadow-sm"
            >
              <FaTimes size={12} />
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-6 border-b border-border bg-surface-muted">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              placeholder="ค้นหาสินค้า"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fg focus:border-transparent bg-surface shadow-sm"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                หมวดหมู่
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fg focus:border-transparent bg-surface shadow-sm"
              >
                <option value="">หมวดหมู่</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                แบรนด์
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fg focus:border-transparent bg-surface shadow-sm"
              >
                <option value="">แบรนด์</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                สถานะ
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fg focus:border-transparent bg-surface shadow-sm"
              >
                <option value="">ทุกสถานะ</option>
                <option value="active">เปิดใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
            </div>

            {/* Items Per Page */}
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                แสดงต่อหน้า
              </label>
              <select
                value={itemsPerPage}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fg focus:border-transparent bg-surface shadow-sm"
                disabled
              >
                <option value={10}>10 รายการ</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="hidden max-h-[70vh] overflow-auto md:block">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-surface-muted">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                สินค้า
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider cursor-pointer hover:bg-surface-muted transition-colors"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center gap-2">
                  หมวดหมู่
                  <SortIcon field="category" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider cursor-pointer hover:bg-surface-muted transition-colors"
                onClick={() => handleSort("brand")}
              >
                <div className="flex items-center gap-2">
                  แบรนด์
                  <SortIcon field="brand" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider cursor-pointer hover:bg-surface-muted transition-colors"
                onClick={() => handleSort("price")}
              >
                <div className="flex items-center gap-2">
                  ราคา
                  <SortIcon field="price" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider cursor-pointer hover:bg-surface-muted transition-colors"
                onClick={() => handleSort("stock")}
              >
                <div className="flex items-center gap-2">
                  สต็อก
                  <SortIcon field="stock" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider cursor-pointer hover:bg-surface-muted transition-colors"
                onClick={() => handleSort("isActive")}
              >
                <div className="flex items-center gap-2">
                  สถานะ
                  <SortIcon field="isActive" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {paginatedProducts.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-surface-muted transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-border shadow-sm">
                      {resolveProductImageUrl(product.imageUrl) ? (
                        <Image
                          className="object-cover"
                          src={resolveProductImageUrl(product.imageUrl)}
                          alt={product.name}
                          fill
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center">
                          <FaImage className="text-fg-subtle text-xl" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-fg mb-1">
                        {product.name}
                      </div>
                      <div className="text-sm text-fg-muted truncate max-w-xs">
                        {product.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-fg">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-fg">
                    {categories.find((cat) => cat.id == product.categoryId)
                      ?.name || "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-fg">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-fg">
                    {brands.find((brand) => brand.id == product.brandId)
                      ?.name || "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-fg">
                  ฿{Number(product.price).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-fg">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stock > 10
                        ? "bg-success-soft text-success"
                        : product.stock > 0
                        ? "bg-warning-soft text-warning"
                        : "bg-danger-soft text-danger"
                    }`}
                  >
                    {product.stock} ชิ้น
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      product.isActive
                        ? "bg-success-soft text-success border border-border"
                        : "bg-surface-muted text-fg-muted border border-border"
                    }`}
                  >
                    {product.isActive ? "แสดงอยู่" : "ซ่อนอยู่"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(product)}
                        className="px-3 py-1.5 bg-surface-muted text-fg hover:bg-surface-muted rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        title="แก้ไขสินค้า"
                      >
                        <FaEdit size={13} />
                        แก้ไข
                      </button>
                    )}
                    {(onDelete || onView) && (
                      <button
                        onClick={() => onDelete ? onDelete(product) : onView(product)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                          product.isActive
                            ? "bg-warning-soft text-warning hover:bg-warning-soft"
                            : "bg-success-soft text-success hover:bg-success-soft"
                        }`}
                        title={product.isActive ? "ซ่อนสินค้าจากหน้าร้าน" : "เปิดแสดงสินค้าหน้าร้าน"}
                      >
                        <FaEye size={13} />
                        {product.isActive ? "ซ่อนสินค้า" : "แสดงสินค้า"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 p-4 md:hidden">
        {paginatedProducts.map((product) => (
          <li
            key={product.id}
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-border">
                {resolveProductImageUrl(product.imageUrl) ? (
                  <Image
                    src={resolveProductImageUrl(product.imageUrl)}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <FaImage className="text-fg-subtle" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-fg">{product.name}</p>
                <p className="text-sm text-fg-muted">
                  ฿{Number(product.price).toLocaleString()} · {product.stock} ชิ้น
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {onView && (
                <button
                  type="button"
                  onClick={() => onView(product)}
                  className="rounded-lg p-2 text-fg"
                  aria-label="ดูรายละเอียด"
                >
                  <FaEye />
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  className="rounded-lg p-2 text-fg"
                  aria-label="แก้ไข"
                >
                  <FaEdit />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(product)}
                  className={`rounded-lg p-2 ${product.isActive ? 'text-warning' : 'text-success'}`}
                  aria-label={product.isActive ? 'ซ่อนสินค้า' : 'แสดงสินค้า'}
                >
                  <FaEye />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border bg-surface-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-fg">
              แสดง {startIndex + 1} ถึง{" "}
              {Math.min(startIndex + itemsPerPage, sortedProducts.length)} จาก{" "}
              {sortedProducts.length} รายการ
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted transition-colors"
              >
                <FaChevronLeft size={12} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-fg text-canvas border-fg shadow-sm"
                        : "border-border text-fg hover:bg-surface-muted"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted transition-colors"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {paginatedProducts.length === 0 && (
        <EmptyState
          title="ไม่พบสินค้า"
          description="ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา"
          actionLabel={
            searchTerm || selectedCategory || selectedBrand || statusFilter
              ? "ล้างตัวกรอง"
              : undefined
          }
          onAction={
            searchTerm || selectedCategory || selectedBrand || statusFilter
              ? clearFilters
              : undefined
          }
        />
      )}
    </div>
  );
}
