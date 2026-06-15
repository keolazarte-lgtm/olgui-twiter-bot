import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "DINASTY ACADEMY — Creadoras de Élite",
  description:
    "Aprendé a crear contenido de élite, proteger tu identidad y cobrar — con o sin rostro. Manual completo de configuración y privacidad para OnlyFans.",
  keywords: [
    "onlyfans",
    "creadora de contenido",
    "privacidad",
    "geoblocking",
    "cobrar sin rostro",
    "manual onlyfans",
    "dinasty academy",
  ],
  authors: [{ name: "Dinasty Academy" }],
  icons: {
    icon: "/dinasty-favicon-v2.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "DINASTY ACADEMY — Creadoras de Élite",
    description:
      "Manual completo de configuración y privacidad. Aprendé a cobrar sin exponer tu identidad.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dinasty Academy",
  },
};

export const viewport: Viewport = {
  themeColor: "#d4af37",
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
