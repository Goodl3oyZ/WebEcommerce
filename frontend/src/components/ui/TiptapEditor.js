"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  FaBold,
  FaItalic,
  FaListUl,
  FaListOl,
  FaLink,
  FaUndo,
  FaRedo,
} from "react-icons/fa";

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-300 p-2 flex flex-wrap gap-2 bg-gray-50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded ${
          editor.isActive("bold")
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        title="Bold"
      >
        <FaBold size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded ${
          editor.isActive("italic")
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        title="Italic"
      >
        <FaItalic size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded ${
          editor.isActive("bulletList")
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        title="Bullet List"
      >
        <FaListUl size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded ${
          editor.isActive("orderedList")
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        title="Numbered List"
      >
        <FaListOl size={14} />
      </button>
      <button
        onClick={() => {
          const url = window.prompt("Enter URL");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={`p-2 rounded ${
          editor.isActive("link")
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        title="Add Link"
      >
        <FaLink size={14} />
      </button>
      <div className="border-l border-gray-300 mx-2"></div>
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
        title="Undo"
      >
        <FaUndo size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
        title="Redo"
      >
        <FaRedo size={14} />
      </button>
    </div>
  );
};

export default function TiptapEditor({
  value,
  onChange,
  placeholder = "Enter text...",
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4 min-h-[200px]",
      },
    },
    immediatelyRender: false, // SSR hydration fix
  });

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden relative">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {!value && !editor?.getText().trim() && (
        <div className="absolute top-16 left-4 text-gray-400 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
