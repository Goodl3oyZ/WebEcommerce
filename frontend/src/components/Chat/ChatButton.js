"use client";

import { useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { MessageCircle, X } from "lucide-react";

export const ChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
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
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 text-white rounded-full p-4 hover:bg-blue-600 transition-colors shadow-lg"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};
