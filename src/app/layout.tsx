import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Screen9",
  description: "Premium Movie Streaming Platform",
  manifest: "/manifest.json",
  themeColor: "#FF7A00",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Screen9",
  },
  icons: {
    apple: "/icon.png",
  },
};

import ConditionalNavbar from "@/components/ConditionalNavbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConditionalNavbar>
          <Navbar />
        </ConditionalNavbar>
        {children}
      </body>
    </html>
  );
}
