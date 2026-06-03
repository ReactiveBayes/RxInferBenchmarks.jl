import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RxInfer Benchmarks",
  description:
    "Performance benchmarks for RxInfer.jl tracked over time across Julia versions and hardware targets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-screen flex-col">
        <Providers>
          {/* Sticky-footer layout: content scrolls, the footer always sits at the
              bottom of the viewport, full width, independent of page internals. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
