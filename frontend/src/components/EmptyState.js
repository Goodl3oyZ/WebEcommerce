// components/EmptyState.js
import React from "react";
import { FiInbox, FiPlus } from "react-icons/fi";

const EmptyState = ({
  title = "ไม่พบข้อมูล",
  description = "ยังไม่มีข้อมูลที่จะแสดง",
  icon: Icon = FiInbox,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      <p className="text-gray-500 mb-6 max-w-sm">{description}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
