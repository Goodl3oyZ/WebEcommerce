import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { Toaster } from "react-hot-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClientLayout from "@/components/Chat/ClientLayout"; // อย่าลืม import
import { Kanit } from "next/font/google";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["500"], // medium
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
      <body className={kanit.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <ChatProvider>
            <Toaster position="top-center" />
            <Header />
            <script src="https://cdn.omise.co/omise.js" />
            <main className="w-full min-h-screen">
              {/* ใช้ ClientLayout เพื่อจัดการกับการแชท */}
              <ClientLayout>{children}</ClientLayout>
            </main>
          </ChatProvider>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
