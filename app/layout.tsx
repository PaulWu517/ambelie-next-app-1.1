import type { Metadata } from "next";
import "./globals.css";

import Header from "@/components/Header"; 
import Footer from "@/components/Footer";
import RouteVisibility from "@/components/RouteVisibility";
import DataInitProvider from "@/app/providers/DataInitProvider";
import AntiSaveGuard from "@/components/AntiSaveGuard";
// import AIChatButton from "@/components/AIChatButton"; // 暂时隐藏AI助手功能

export const metadata: Metadata = {
  title: "Ambelie", 
  description: "Discover Ambelie's unique collection of antique furniture, modern designs, and fashion.",
  icons: {
    icon: [
      { url: "/assets/vi/avatar.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/assets/vi/avatar.png?v=3", sizes: "16x16", type: "image/png" }
    ],
    shortcut: [
      { url: "/favicon.ico?v=3", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/vi/avatar.png?v=3" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/vi/avatar.png?v=3" />
        <link rel="icon" href="/favicon.ico?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="manifest" href="/site.webmanifest?v=3" />
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
        <style>{`
          img { 
            -webkit-user-drag: none; 
            -webkit-touch-callout: none; 
            -webkit-user-select: none; 
            -moz-user-select: none; 
            -ms-user-select: none; 
            user-select: none; 
          }
        `}</style>
      </head>
      <body className="antialiased">
        <DataInitProvider>
          <AntiSaveGuard />
          <RouteVisibility>
            <Header />
          </RouteVisibility>
          {children}
          <RouteVisibility>
            <Footer />
          </RouteVisibility>
          {/* <AIChatButton /> */} {/* 暂时隐藏AI助手功能 */}
        </DataInitProvider>
      </body>
    </html>
  );
}
