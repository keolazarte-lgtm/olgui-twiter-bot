import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "DINASTÍA ACADEMY — Creadoras de Élite",
  description:
    "Aprendé a crear contenido de élite, proteger tu identidad y cobrar — con o sin rostro. Manual completo de configuración y privacidad para OnlyFans.",
  keywords: [
    "onlyfans",
    "creadora de contenido",
    "privacidad",
    "geoblocking",
    "cobrar sin rostro",
    "manual onlyfans",
    "dinastia academy",
  ],
  authors: [{ name: "Dinastía Academy" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👑</text></svg>",
  },
  openGraph: {
    title: "DINASTÍA ACADEMY — Creadoras de Élite",
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
