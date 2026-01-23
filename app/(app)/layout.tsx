"use client";

import HomePage from "./HomePage";
import Navbar from "@/components/Navbar";
import AppNavigationBridge from "@/components/navigation/AppNavigationBridge";
import { UploadProvider } from "@/components/upload/UploadContext";

export default function AppLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <AppNavigationBridge />
      <UploadProvider>
        <HomePage />
      </UploadProvider>
      {children}
      {overlay}
    </>
  );
}
