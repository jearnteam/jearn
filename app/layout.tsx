// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Shadows_Into_Light } from "next/font/google";
import "@/globals.css";
import "katex/dist/katex.min.css";

import Providers from "./providers";
import ClientLayout from "./ClientLayout";
import I18nProvider from "@/components/I18nProvider";
import LanguageInitializer from "@/components/LanguageInitializer";
import UserThemeSync from "@/components/UserThemeSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const shadowsIntoLight = Shadows_Into_Light({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-shadows-into-light",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jearn.site"),

  title: {
    default: "JEARN",
    template: "%s | JEARN",
  },

  description:
    "JEARN is a knowledge sharing platform where students can share ideas, ask questions, and collaborate.",

  manifest: "/manifest.webmanifest",
  
  keywords: [
    "JEARN",
    "knowledge sharing",
    "student community",
    "learning platform",
    "education",
    "collaboration",
  ],

  openGraph: {
    title: "JEARN - Knowledge Sharing Platform",
    description:
      "JEARN is a platform where students share knowledge and collaborate.",
    url: "https://jearn.site",
    siteName: "JEARN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "JEARN",
    description: "Knowledge sharing platform for students",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          antialiased transition-colors duration-300
          ${geistSans.variable}
          ${geistMono.variable}
          ${shadowsIntoLight.variable}
        `}
      >
        <Providers>
          <LanguageInitializer />
          <ClientLayout>
            <UserThemeSync />
            <I18nProvider>{children}</I18nProvider>
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
