import React from "react";
import { FiAlertTriangle, FiRefreshCw, FiArrowLeft } from "react-icons/fi";

const ErrorState = ({
  title = "เกิดข้อผิดพลาด",
  message = "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
  error,
  onRetry,
  onGoBack,
  retryLabel = "ลองใหม่",
  goBackLabel = "กลับ",
  showDetails = false,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <FiAlertTriangle className="h-8 w-8" aria-hidden />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-fg">{title}</h3>
      <p className="mb-6 max-w-md text-sm text-fg-muted">{message}</p>
      {showDetails && error && (
        <div className="mb-6 w-full max-w-md">
          <details className="rounded-xl bg-surface-muted p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-fg">
              รายละเอียดข้อผิดพลาด
            </summary>
            <div className="mt-2 rounded-lg border border-border bg-surface p-2 font-mono text-xs text-fg-muted">
              {error.message || JSON.stringify(error, null, 2)}
            </div>
          </details>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center rounded-xl bg-fg px-4 py-2 text-sm font-medium text-canvas transition-colors duration-150 hover:bg-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
          >
            <FiRefreshCw className="mr-2 h-4 w-4" />
            {retryLabel}
          </button>
        )}
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex items-center rounded-xl bg-surface-muted px-4 py-2 text-sm font-medium text-fg transition-colors duration-150 hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            {goBackLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
