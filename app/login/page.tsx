"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If already authenticated and user presses "Continue"
  const handleContinue = () => {
    router.replace("/"); // go back to main page
  };

  // If user wants to log in with another Google account
  const handleSwitchAccount = () => {
    signIn("google", { prompt: "select_account", callbackUrl: "/" });
  };

  // If not logged in, just show normal login
  const handleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };

  // When already authenticated and directly visiting /login → auto redirect
  useEffect(() => {
    if (status === "authenticated") {
      // Do nothing automatically here — let user choose instead
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // ✅ Already logged in → show "Continue" or "Switch"
  if (status === "authenticated" && session?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center w-80">
          {session.user.picture ? (
            <img
              src={session.user.picture}
              alt="avatar"
              className="w-16 h-16 rounded-full mx-auto mb-3 object-cover object-center"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-3" />
          )}
          <h1 className="text-lg font-semibold mb-1">
            Welcome back, {session.user.name || "User"}!
          </h1>
          <p className="text-sm text-gray-500 mb-5">{session.user.email}</p>

          <button
            onClick={handleContinue}
            className="w-full mb-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Continue as {session.user.name || "this account"}
          </button>

          <button
            onClick={handleSwitchAccount}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Sign in with another account
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Need to log out completely?{" "}
            <a href="/logout" className="underline hover:text-gray-600">
              Logout
            </a>
          </p>
        </div>
      </div>
    );
  }

  // 🚪 Not logged in → show basic Google Sign-in
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center w-80">
        <h1 className="text-2xl font-bold mb-6">Sign in to JEARN</h1>
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
