"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  FaBold,
  FaItalic,
  FaListUl,
  FaListOl,
  FaLink,
  FaUndo,
  FaRedo,
} from "react-icons/fa";

// Dynamically import Tiptap components to avoid SSR issues
const TiptapEditor = dynamic(() => import("./TiptapEditor"), {
  ssr: false,
  loading: () => (
    <div className="border border-border rounded-md overflow-hidden relative">
      <div className="border-b border-border p-2 flex flex-wrap gap-2 bg-surface-muted">
        <div className="text-fg-subtle text-sm">Loading editor...</div>
      </div>
      <div className="p-4 min-h-[200px] bg-surface-muted">
        <div className="text-fg-subtle">Loading...</div>
      </div>
    </div>
  ),
});

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
}) {
  return (
    <TiptapEditor value={value} onChange={onChange} placeholder={placeholder} />
  );
}
