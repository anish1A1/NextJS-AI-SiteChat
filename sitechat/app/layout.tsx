import type { Metadata } from "next";
import {  JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import ErrorToastHandler from "@/components/ErrorToastHandler";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "sitechat | Private Ephemeral Rooms",
  description: "Secure chat rooms that self-destruct after 10 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
          <Providers>
            {children}

            <Toaster position="top-center" richColors/>

            <Suspense fallback={null}>
              <ErrorToastHandler />
            </Suspense>
          </Providers>
      </body>
    </html>
  );
}
