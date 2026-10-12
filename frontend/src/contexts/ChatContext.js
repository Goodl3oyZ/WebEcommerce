"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const ChatContext = createContext({ socket: null, connected: false });

/** One authenticated Socket.IO connection per signed-in browser tab. */
export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    // In production the reverse proxy serves Socket.IO on the same origin.
    const url =
      process.env.NEXT_PUBLIC_WS_URL ||
      (window.location.hostname === "localhost" ? "http://localhost:5000" : window.location.origin);
    const s = io(url, { withCredentials: true, transports: ["websocket"] });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <ChatContext.Provider value={{ socket, connected }}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);

/** Subscribe to a socket event for the lifetime of a component. */
export function useSocketEvent(event, handler) {
  const { socket } = useChat();
  useEffect(() => {
    if (!socket) return undefined;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}
