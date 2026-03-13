"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  function loginWithGoogle() {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isPWA) {
      window.open("/api/auth/signin/google?callbackUrl=/pwa-login", "_blank");
    } else {
      signIn("google", {
        callbackUrl: "/",
        prompt: "select_account",
      });
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center w-80">
        <h1 className="text-2xl font-bold mb-6">Sign in to JEARN</h1>

        <button
          onClick={loginWithGoogle}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
