"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  // ✅ If already logged in, go home
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // ⏳ Loading session state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading…</p>
      </div>
    );
  }

  // 🔐 Login UI (only shows when unauthenticated)
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center w-80">
        <h1 className="text-2xl font-bold mb-6">Sign in to JEARN</h1>

        <button
          onClick={() =>
            signIn("google", {
              callbackUrl: "/",
              prompt: "select_account",
            })
          }
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
