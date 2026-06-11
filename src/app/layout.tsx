import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TweetBot — Auto-Promo Scheduler",
  description: "Publicá contenido de promoción en Twitter las 24hs apuntando a horarios extranjeros. Automático, inteligente, sin esfuerzo.",
  keywords: ["twitter", "auto-post", "scheduler", "promo", "content creator", "onlyfans", "marketing"],
  authors: [{ name: "TweetBot" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "TweetBot — Auto-Promo Scheduler",
    description: "Publicá contenido de promoción en Twitter las 24hs. Automático.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Dancing+Script:wght@700&family=Lobster&family=Oswald:wght@700&family=Pacifico&family=Permanent+Marker&family=Press+Start+2P&family=Russo+One&family=Shadows+Into+Light&family=Staatliches&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
