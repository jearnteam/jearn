"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AfterGoogleLogout() {

  useEffect(() => {
    const timer = setTimeout(() => {
      signIn("google", {
        prompt: "select_account",
        callbackUrl: "/",
      });
    }, 1000); // wait 1 second for Google global logout to finish

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
        <p className="text-lg">Preparing Google login…</p>
        <p className="text-sm text-gray-500 mt-2">
          If Google logout opened in a new tab, please wait 1–2 seconds…
        </p>
      </div>
    </div>
  );
}
