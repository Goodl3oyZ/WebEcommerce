// components/ClientLayout.js
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ChatButton } from "@/components/Chat/ChatButton";

export default function ClientLayout({ children }) {
  const { user } = useAuth();

  return (
    <>
      {children}
      {user ? <ChatButton /> : null}
    </>
  );
}
