"use client";

import * as React from "react";
import classNames from "classnames";

export const Textarea = React.forwardRef(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={classNames(
        "w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
        className
      )}
      rows={4}
      {...props}
    />
  );
});
