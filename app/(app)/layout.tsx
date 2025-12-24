"use client";

import HomePage from "./HomePage";

export default function AppLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  return (
    <>
      <HomePage />   {/* 🔒 stays mounted */}
      {children}
      {overlay}
    </>
  );
}
