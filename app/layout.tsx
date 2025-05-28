import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // 移除 Geist 字体
import "./globals.css";
// 移除 next/head 的导入，因为它不适用于此处添加全局 <link>

// 引入 Header 和 Footer 组件
import Header from "@/components/Header"; 
import Footer from "@/components/Footer";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  // 我们稍后会根据需要更新这里的元数据，或者在每个页面单独设置
  title: "Ambelie", 
  description: "Discover Ambelie's unique collection of antique furniture, modern designs, and fashion.",
  // 在 metadata 中添加 Font Awesome 通常不用于 stylesheets，直接在html的head中添加更可靠
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
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
      </head>
      {/* 移除之前的 geistSans.variable 和 geistMono.variable */}
      {/* 您在 globals.css 中定义的字体将通过 CSS 级联应用 */}
      <body className="antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
