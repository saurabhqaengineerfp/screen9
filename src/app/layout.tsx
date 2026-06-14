import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Screen9 | Premium Movie Streaming",
  description: "Your ultimate destination for cinematic masterpieces.",
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
