import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import AntdProvider from "@/AntdProvider";
import QueryProvider from "@/QueryProvider";
import AppLayout from "@/components/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlacePulse — GrabMaps Location Intelligence",
  description: "Live neighborhood briefings for any place in Southeast Asia",
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
          <QueryProvider>
            <AntdRegistry>
              <AntdProvider>
                <AppLayout>{children}</AppLayout>
              </AntdProvider>
            </AntdRegistry>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
