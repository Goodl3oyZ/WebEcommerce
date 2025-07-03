// components/ErrorState.js
import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

const ErrorState = ({ 
  title = "เกิดข้อผิดพลาด", 
  message = "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
  error,
  onRetry,
  onGoBack,
  retryLabel = "ลองใหม่",
  goBackLabel = "กลับ",
  showDetails = false,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <FiAlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md">
        {message}
      </p>

      {/* Error Details (แสดงเมื่อ showDetails = true) */}
      {showDetails && error && (
        <div className="w-full max-w-md mb-6">
          <details className="bg-gray-50 rounded-lg p-4 text-left">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
              รายละเอียดข้อผิดพลาด
            </summary>
            <div className="mt-2 text-xs text-gray-600 font-mono bg-white rounded p-2 border">
              {error.message || JSON.stringify(error, null, 2)}
            </div>
          </details>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </button>
        )}
        
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            {goBackLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;