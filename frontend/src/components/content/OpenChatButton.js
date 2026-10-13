"use client";

import { MessageCircle } from "lucide-react";

/** Opens the support chat widget (it listens for "support:open"). */
export default function OpenChatButton({ className = "", children = "แชทกับทีมงาน" }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("support:open"))}
      className={`inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-canvas transition-colors hover:bg-fg/85 ${className}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}
