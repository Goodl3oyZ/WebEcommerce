// C:\Users\panud\OneDrive\Desktop\Web\frontend\src\components\Pagination.js

import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const safeTotalPages = isNaN(totalPages) || totalPages < 1 ? 1 : totalPages;
  const safeCurrentPage =
    isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;
  const adjustedCurrentPage = Math.min(safeCurrentPage, safeTotalPages);

  const isFirstPage = adjustedCurrentPage <= 1;
  const isLastPage = adjustedCurrentPage >= safeTotalPages;
  // const hasOnlyOnePage = safeTotalPages <= 1; // You can remove or ignore this variable if you always want to show it

  console.log("currentPage (safe):", adjustedCurrentPage);
  console.log("totalPages (safe):", safeTotalPages);
  console.log("isLastPage (safe):", isLastPage);

  // REMOVE THIS BLOCK if you want to always show pagination
  // if (hasOnlyOnePage) {
  //   return null;
  // }

  const getPageNumbers = () => {
    // ... (rest of the getPageNumbers function remains the same)
    const pages = [];
    const maxPagesToShow = 5;
    const halfMax = Math.floor(maxPagesToShow / 2);

    if (safeTotalPages <= maxPagesToShow) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, adjustedCurrentPage - halfMax);
      let end = Math.min(safeTotalPages - 1, adjustedCurrentPage + halfMax);

      if (adjustedCurrentPage - start < halfMax) {
        end = Math.min(
          safeTotalPages - 1,
          end + (halfMax - (adjustedCurrentPage - start))
        );
      }
      if (end - adjustedCurrentPage < halfMax) {
        start = Math.max(2, start - (halfMax - (end - adjustedCurrentPage)));
      }

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < safeTotalPages - 1) {
        pages.push("...");
      }

      pages.push(safeTotalPages);
    }
    return pages;
  };

  const displayedPageNumbers = getPageNumbers();

  return (
    <nav
      className="flex items-center justify-center space-x-2 my-8"
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(adjustedCurrentPage - 1)}
        disabled={isFirstPage}
        className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label="Previous page"
      >
        <FiChevronLeft className="h-5 w-5 mr-2" /> Previous
      </button>

      {displayedPageNumbers.map((page) =>
        page === "..." ? (
          <span
            key={page + Math.random()}
            className="px-3 py-2 text-sm font-medium text-gray-700"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={adjustedCurrentPage === page ? "page" : undefined}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
              ${
                adjustedCurrentPage === page
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            aria-label={`Page ${page}`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(adjustedCurrentPage + 1)}
        disabled={isLastPage}
        className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label="Next page"
      >
        Next <FiChevronRight className="h-5 w-5 ml-2" />
      </button>
    </nav>
  );
}
