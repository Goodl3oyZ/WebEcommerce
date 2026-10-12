"use client";

import { forwardRef } from "react";
import { clsx } from "clsx";

const Input = forwardRef(({ className, type, error, ...props }, ref) => {
  return (
    <input
      type={type}
      className={clsx(
        "input-primary",
        error && "border-danger focus-visible:ring-danger",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
