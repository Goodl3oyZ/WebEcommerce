"use client";

import * as React from "react";
import classNames from "classnames";

export const Button = React.forwardRef(function Button(
  { className, variant = "default", ...props },
  ref
) {
  const baseStyles =
    "inline-flex items-center justify-center px-4 py-2 font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    default:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    outline:
      "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-300",
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  return (
    <button
      ref={ref}
      className={classNames(baseStyles, variantStyles[variant], className)}
      {...props}
    />
  );
});
