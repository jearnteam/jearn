// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Shadows_Into_Light } from "next/font/google";
import "@/globals.css";

import Providers from "./providers";
import ClientLayout from "./ClientLayout";
import Navbar from "@/components/Navbar";
import I18nProvider from "@/components/I18nProvider";
import LanguageInitializer from "@/components/LanguageInitializer";
import UserThemeSync from "@/components/UserThemeSync";
import AppNavigationBridge from "@/components/navigation/AppNavigationBridge";

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
      <body
        className={`
          antialiased transition-colors duration-300
          ${geistSans.variable}
          ${geistMono.variable}
          ${shadowsIntoLight.variable}
        `}
      >
        <Providers>
          <ClientLayout>
            <UserThemeSync />
            <AppNavigationBridge />
            <I18nProvider>
              <LanguageInitializer />

              <Navbar />

              {/* ⚠️ children will now include (app) or (protected) */}
              <div className="pt-[4.3rem] min-h-screen bg-background text-foreground">
                {children}
              </div>
            </I18nProvider>
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
