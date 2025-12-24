// @/app/after-google-logout/page.tsx
"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AfterGoogleLogoutPage() {
  useEffect(() => {
    signIn("google", {
      callbackUrl: "/",
      prompt: "select_account",
    });
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Choose an account…</p>
    </div>
  );
}
