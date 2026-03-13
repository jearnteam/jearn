"use client";

import { useEffect } from "react";

export default function PWALoginRedirect() {
  useEffect(() => {
    // reopen the installed PWA
    window.location.href = "/";
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      Redirecting to JEARN…
    </div>
  );
}