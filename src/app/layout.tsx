import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/CartContext";
import { OrderProvider } from "@/lib/OrderContext";
import { MenuProvider } from "@/lib/MenuContext";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "@/lib/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dineo — Gestão de Restaurantes",
  description: "Plataforma de gestão para restaurantes em Cabo Verde.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dineo",
    startupImage: "/apple-touch-icon.png",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png",  sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-slate-50 text-slate-900 antialiased selection:bg-primary-200 selection:text-primary-900`}
      >
        <AuthProvider>
          <MenuProvider>
            <OrderProvider>
              <CartProvider>
                {children}
                <Toaster />
              </CartProvider>
            </OrderProvider>
          </MenuProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
