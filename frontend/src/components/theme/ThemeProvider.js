"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="webecommerce-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
