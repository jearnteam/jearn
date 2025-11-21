"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleContinue = () => {
    router.replace("/");
  };

  const handleSwitchAccount = () => {
    signIn("google", {
      callbackUrl: "/",
      prompt: "select_account",
      hd: "*",
    });
  };

  const handleLogin = () => {
    signIn("google", {
      callbackUrl: "/",
      prompt: "select_account",
      hd: "*",
    });
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // Already logged in - let user continue or switch
  if (status === "authenticated" && session?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center w-80">
          <img
            src={session.user.picture || ""}
            className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
          />

          <h1 className="text-lg font-semibold mb-1">
            Welcome back, {session.user.name || "User"}!
          </h1>
          <p className="text-sm text-gray-500 mb-5">{session.user.email}</p>

          <button
            onClick={handleContinue}
            className="w-full mb-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Continue as {session.user.name || "this account"}
          </button>

          <button
            onClick={handleSwitchAccount}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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

  // Not logged in
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center w-80">
        <h1 className="text-2xl font-bold mb-6">Sign in to JEARN</h1>
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign in with Google
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Already logged into wrong account?{" "}
          <a href="/logout" className="underline hover:text-gray-600">
            Logout first
          </a>
        </p>
      </div>
    </div>
  );
}
