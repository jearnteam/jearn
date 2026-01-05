"use client";

import HomePage from "./HomePage";
import Navbar from "@/components/Navbar";
import AppNavigationBridge from "@/components/navigation/AppNavigationBridge";

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

      <HomePage />

      {children}
      {overlay}
    </>
  );
}
