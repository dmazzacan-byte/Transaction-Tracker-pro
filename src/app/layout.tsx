import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Tabs from "@/components/Tabs";
import { LanguageProvider } from "@/contexts/LanguageProvider";
import { AuthProvider } from "@/contexts/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TransactionTracker Pro",
  description: "A simple app to track your transactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LanguageProvider>
            <Header />
            <Tabs />
            <main className="p-4">{children}</main>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
