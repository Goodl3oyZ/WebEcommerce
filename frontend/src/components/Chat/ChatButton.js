"use client";

import { useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { MessageCircle, X } from "lucide-react";

export const ChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 z-50 lg:bottom-6 lg:right-6">
      {isOpen ? (
        <div className="relative">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X size={20} />
          </button>
          <ChatWindow />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="แชทกับร้านค้า"
          className="rounded-full bg-fg p-4 text-canvas shadow-lg transition-colors hover:bg-fg/85"
        >
          <MessageCircle size={22} aria-hidden />
        </button>
      )}
    </div>
  );
};
