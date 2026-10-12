"use client";

import SupportWidget from "@/components/Chat/SupportWidget";

export default function ClientLayout({ children }) {
  return (
    <>
      {children}
      <SupportWidget />
    </>
  );
}
