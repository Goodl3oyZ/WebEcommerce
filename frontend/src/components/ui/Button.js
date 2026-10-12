"use client";

import * as React from "react";
import classNames from "classnames";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150 ease-out " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg " +
  "disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variants = {
  // Ink button: the default strong action.
  default: "bg-fg text-canvas hover:bg-fg/85",
  // Lime: reserved for the single primary commerce action on a screen.
  brand: "bg-brand text-brand-ink hover:bg-brand-hover",
  outline: "border border-fg/25 bg-transparent text-fg hover:border-fg hover:bg-fg/5",
  ghost: "bg-transparent text-fg hover:bg-fg/5",
  danger: "bg-danger text-white hover:bg-danger/90",
  destructive: "bg-danger text-white hover:bg-danger/90",
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "h-10 w-10 p-0",
};

/** Class names for a button-styled element (use on <Link> for navigation). */
export function buttonClasses({ variant = "default", size = "md", className } = {}) {
  return classNames(base, variants[variant] ?? variants.default, sizes[size] ?? sizes.md, className);
}

export const Button = React.forwardRef(function Button(
  { className, variant = "default", size = "md", type = "button", ...props },
  ref
) {
  return <button ref={ref} type={type} className={buttonClasses({ variant, size, className })} {...props} />;
});
