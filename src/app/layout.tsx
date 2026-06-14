import type { Metadata } from "next";
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
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 160'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23F5D77A'/><stop offset='100%25' stop-color='%23D4AF37'/></linearGradient></defs><path d='M30 52L35 28L42 42L50 20L58 42L65 28L70 52' stroke='%23D4AF37' stroke-width='2' fill='url(%23g)' stroke-linejoin='round'/><rect x='30' y='50' width='40' height='4' rx='1' fill='url(%23g)'/><path d='M24 58L76 58L76 105Q76 135 50 148Q24 135 24 105Z' fill='%231a1508' stroke='%23D4AF37' stroke-width='2'/><text x='50' y='105' text-anchor='middle' font-family='serif' font-size='36' font-weight='bold' fill='%23D4AF37' letter-spacing='2'>DA</text></svg>",
  },
  openGraph: {
    title: "DINASTY ACADEMY — Creadoras de Élite",
    description:
      "Manual completo de configuración y privacidad. Aprendé a cobrar sin exponer tu identidad.",
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
