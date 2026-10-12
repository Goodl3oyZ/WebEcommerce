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

// Kanit: headings / brand; Noto Sans Thai: body and UI text.
const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-admin",
});

export const metadata = {
  title: {
    default: "CHALLENGE — อุปกรณ์วิ่ง ฟิตเนส และเทรนนิ่ง",
    template: "%s | CHALLENGE",
  },
  description:
    "ร้านอุปกรณ์กีฬาสำหรับนักวิ่งและสายเทรนนิ่ง: รองเท้า เสื้อผ้า และอุปกรณ์เสริมสำหรับทุกการซ้อม",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning={true}>
      <body
        className={`${kanit.variable} ${notoSansThai.variable} font-sans bg-canvas text-fg antialiased`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-sm focus:text-canvas"
              >
                ข้ามไปยังเนื้อหา
              </a>
              <Toaster
                position="top-center"
                toastOptions={{
                  className: "!rounded-xl !bg-fg !text-canvas !text-sm !shadow-lg",
                  style: { whiteSpace: "pre-line" },
                  success: { iconTheme: { primary: "hsl(77 96% 56%)", secondary: "#111" } },
                }}
              />
              <Header />
              <Script
                src="https://cdn.omise.co/omise.js"
                strategy="afterInteractive"
              />
              <main id="main-content" className="w-full min-h-[70vh]">
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
