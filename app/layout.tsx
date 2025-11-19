import type { Metadata } from "next";
import { Geist, Geist_Mono, Shadows_Into_Light } from "next/font/google";
import "@/globals.css";

import I18nProvider from "@/components/I18nProvider";
import Navbar from "@/components/Navbar";
import ClientLayout from "./ClientLayout";
import UserThemeSync from "@/components/UserThemeSync";
import LanguageInitializer from "@/components/LanguageInitializer";
import SWRegister from "./sw-register";
import Script from "next/script";

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
  title: "JEARN",
  description: "Knowledge Sharing Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <Script
          id="theme-preload"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>

      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          ${shadowsIntoLight.variable}
          antialiased transition-colors duration-300
          bg-white dark:bg-neutral-900
          text-gray-900 dark:text-gray-100
        `}
      >
        <ClientLayout>
          <SWRegister />
          <UserThemeSync />

          <I18nProvider>
            <LanguageInitializer />

            {/* GLOBAL NAVBAR */}
            <Navbar />

            {/* MAIN GRID */}
            <div className="pt-[4.3rem] bg-gray-50 dark:bg-neutral-950 min-h-screen">
              {children}
            </div>
          </I18nProvider>
        </ClientLayout>
      </body>
    </html>
  );
}
