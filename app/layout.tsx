import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const brand = Fraunces({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap"
});

export const metadata: Metadata = {
  title: "FlowState",
  description: "Set daily goals, stay nudged into flow, and learn when you work best."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4EEE6"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${sans.variable} ${brand.variable}`} lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
