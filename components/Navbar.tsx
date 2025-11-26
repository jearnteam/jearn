"use client";

import dynamic from "next/dynamic";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import UserMenu from "@/components/UserMenu";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ThreeBall = dynamic(() => import("./3d_spinner"), {
  ssr: false,
  loading: () => null,
});

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-neutral-900 border-b shadow-sm">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 h-16">

        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div className="w-12 h-12 flex items-center justify-center">
            {hydrated ? <ThreeBall /> : null}
          </div>

          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-shadows-into-light)" }}
          >
            {t("jearn") || "JEARN"}
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {!hydrated ? (
            <div className="w-8 h-8" />
          ) : loading ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("loading")}...
            </span>
          ) : user ? (
            <UserMenu user={user} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
