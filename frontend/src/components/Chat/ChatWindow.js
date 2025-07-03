"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";

export const ChatWindow = () => {
  const { messages, typingUsers, sendMessage, sendTypingStatus } = useChat();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage(message);
    setMessage("");
  };

  const handleTyping = () => {
    sendTypingStatus();
  };

  if (isMinimized) {
    return (
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm">
        <div className="p-3 bg-blue-500 text-white rounded-t-lg flex justify-between items-center">
          <h3 className="font-semibold">Chat</h3>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-white hover:text-gray-200"
          >
            ↑
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] w-full max-w-sm sm:max-w-md md:max-w-md bg-white rounded-lg shadow-lg">
      {/* Chat Header */}
      <div className="p-4 bg-blue-500 text-white rounded-t-lg flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Public Chat</h2>
          <p className="text-sm text-blue-100">
            {typingUsers.length > 0
              ? `${typingUsers.map((u) => u.username).join(", ")} is typing...`
              : "No one is typing"}
          </p>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-white hover:text-gray-200"
        >
          ↓
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.userId === user?.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.userId === user?.id
                  ? "bg-blue-500 text-white"
                  : "bg-white shadow"
              }`}
            >
              {msg.userId !== user?.id && (
                <p className="text-xs font-semibold mb-1">{msg.username}</p>
              )}
              <p>{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleTyping}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
