"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    const socketInstance = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
      {
        withCredentials: true,
      }
    );

    socketInstance.on("connect", () => {
      console.log("Connected to chat server");
      setIsConnected(true);
      socketInstance.emit("join_public");
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from chat server");
      setIsConnected(false);
    });

    socketInstance.on("new_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketInstance.on("user_typing", (data) => {
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });

      // Remove typing status after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }, 3000);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const sendMessage = (content) => {
    if (!socket || !user) return;

    const message = {
      userId: user.id,
      username: user.name || user.email,
      content,
    };

    socket.emit("public_message", message);
  };

  const sendPrivateMessage = (roomId, content) => {
    if (!socket || !user) return;

    const message = {
      roomId,
      userId: user.id,
      username: user.name || user.email,
      content,
    };

    socket.emit("private_message", message);
  };

  const joinPrivateRoom = (roomId) => {
    if (!socket) return;
    socket.emit("join_private", roomId);
  };

  const sendTypingStatus = (roomId = "public") => {
    if (!socket || !user) return;

    socket.emit("typing", {
      roomId,
      userId: user.id,
      username: user.name || user.email,
    });
  };

  const value = {
    messages,
    typingUsers,
    isConnected,
    sendMessage,
    sendPrivateMessage,
    joinPrivateRoom,
    sendTypingStatus,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
