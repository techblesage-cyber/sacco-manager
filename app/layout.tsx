import "./globals.css";
import type { Metadata, Viewport } from "next";
import { PwaClient } from "@/components/pwa";

export const metadata: Metadata = {
  title: {
    default: "SACCO Manager",
    template: "%s · SACCO Manager",
  },
  description: "Member services and financial records for your SACCO.",
  applicationName: "SACCO Manager",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "SACCO", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16436f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaClient />
      </body>
    </html>
  );
}
