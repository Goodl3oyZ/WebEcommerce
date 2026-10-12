import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { Toaster } from "react-hot-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClientLayout from "@/components/Chat/ClientLayout"; // อย่าลืม import
import { Kanit, Noto_Sans_Thai } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["500"], // medium
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-admin",
});

export const metadata = {
  title: "Challenge",
  description:
    "A modern e-commerce platform built for the man who challenging to change",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning={true}>
      <body
        className={`${kanit.className} ${notoSansThai.variable} bg-canvas text-fg antialiased`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <Toaster position="top-center" />
              <Header />
              <Script
                src="https://cdn.omise.co/omise.js"
                strategy="afterInteractive"
              />
              <main className="w-full min-h-screen pt-16 md:pt-20">
                <ClientLayout>{children}</ClientLayout>
              </main>
            </ChatProvider>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
