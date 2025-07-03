import React from "react";

const LoadingSpinner = ({ size = "md" }) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600`}
      />
    </div>
  );
};

export default LoadingSpinner;
