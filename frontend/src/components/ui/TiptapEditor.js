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
  FaQuoteRight,
} from "react-icons/fa";

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-border p-2 flex flex-wrap gap-2 bg-surface-muted">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded ${
          editor.isActive("bold")
            ? "bg-fg text-canvas"
            : "bg-surface hover:bg-surface-muted"
        }`}
        title="Bold"
      >
        <FaBold size={14} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded ${
          editor.isActive("italic")
            ? "bg-fg text-canvas"
            : "bg-surface hover:bg-surface-muted"
        }`}
        title="Italic"
      >
        <FaItalic size={14} />
      </button>
      {[2, 3].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          className={`rounded px-2.5 py-1 text-sm font-semibold ${
            editor.isActive("heading", { level }) ? "bg-fg text-canvas" : "bg-surface hover:bg-surface-muted"
          }`}
          title={`หัวข้อระดับ ${level}`}
        >
          H{level}
        </button>
      ))}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded ${editor.isActive("blockquote") ? "bg-fg text-canvas" : "bg-surface hover:bg-surface-muted"}`}
        title="Quote"
      >
        <FaQuoteRight size={14} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded ${
          editor.isActive("bulletList")
            ? "bg-fg text-canvas"
            : "bg-surface hover:bg-surface-muted"
        }`}
        title="Bullet List"
      >
        <FaListUl size={14} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded ${
          editor.isActive("orderedList")
            ? "bg-fg text-canvas"
            : "bg-surface hover:bg-surface-muted"
        }`}
        title="Numbered List"
      >
        <FaListOl size={14} />
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("Enter URL");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={`p-2 rounded ${
          editor.isActive("link")
            ? "bg-fg text-canvas"
            : "bg-surface hover:bg-surface-muted"
        }`}
        title="Add Link"
      >
        <FaLink size={14} />
      </button>
      <div className="border-l border-border mx-2"></div>
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded bg-surface hover:bg-surface-muted disabled:opacity-50"
        title="Undo"
      >
        <FaUndo size={14} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded bg-surface hover:bg-surface-muted disabled:opacity-50"
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
          class: "text-fg underline hover:text-fg",
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
          "prose prose-sm sm:prose max-w-none dark:prose-invert focus:outline-none p-4 min-h-[200px]",
      },
    },
    immediatelyRender: false, // SSR hydration fix
  });

  return (
    <div className="border border-border rounded-md overflow-hidden relative">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {!value && !editor?.getText().trim() && (
        <div className="absolute top-16 left-4 text-fg-subtle pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
