import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/CartContext";
import { OrderProvider } from "@/lib/OrderContext";
import { MenuProvider } from "@/lib/MenuContext";
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dineo | Servyx",
  description: "B2B Restaurant SaaS platform by Servyx",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dineo",
  },
  themeColor: "#0f172a",
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
              </CartProvider>
            </OrderProvider>
          </MenuProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
