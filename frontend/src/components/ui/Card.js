"use client";

import * as React from "react";
import classNames from "classnames";

export function Card({ className, ...props }) {
  return (
    <div
      className={classNames("bg-white rounded-xl shadow-md", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={classNames("p-4 border-b border-gray-200", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={classNames("p-4", className)} {...props} />;
}
