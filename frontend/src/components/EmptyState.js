import React from "react";
import { FiInbox, FiPlus } from "react-icons/fi";

const EmptyState = ({
  title = "ยังไม่มีข้อมูล",
  description = "เริ่มต้นด้วยการเพิ่มรายการแรกของคุณ",
  icon: Icon = FiInbox,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted text-fg">
        <Icon className="h-8 w-8" aria-hidden />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-fg">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-fg-muted">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center rounded-xl bg-fg px-4 py-2 text-sm font-medium text-canvas transition-colors duration-150 hover:bg-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2"
        >
          <FiPlus className="mr-2 h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
