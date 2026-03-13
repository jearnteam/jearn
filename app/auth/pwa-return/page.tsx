"use client";

import { useEffect } from "react";

export default function PWAReturnPage() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    // If already in PWA, just go home
    if (isStandalone) {
      window.location.replace("/");
      return;
    }

    // Try reopening the installed PWA
    setTimeout(() => {
      window.location.href = "https://jearn.site/?source=pwa-login";
    }, 300);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-lg font-semibold mb-4">Login successful</p>

        <p className="text-sm text-gray-500 mb-6">Returning to JEARN app...</p>

        <a
          href="https://jearn.site/"
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Open JEARN App
        </a>
      </div>
    </div>
  );
}
