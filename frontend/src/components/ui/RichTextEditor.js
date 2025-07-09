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
    <div className="border border-gray-300 rounded-md overflow-hidden relative">
      <div className="border-b border-gray-300 p-2 flex flex-wrap gap-2 bg-gray-50">
        <div className="text-gray-400 text-sm">Loading editor...</div>
      </div>
      <div className="p-4 min-h-[200px] bg-gray-50">
        <div className="text-gray-400">Loading...</div>
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
