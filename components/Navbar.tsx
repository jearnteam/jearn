"use client";

import dynamic from "next/dynamic";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import UserMenu from "@/components/UserMenu";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
      <div className="mx-auto flex gap-4 justify-around items-center px-4 h-16">
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

        <div className="flex items-center w-full max-w-md">
          <label htmlFor="search-input" className="sr-only">
            Search
          </label>
          <div
            id="search-input"
            className="
              flex items-center
              w-full px-4 py-2
              text-black dark:text-white
              bg-white dark:bg-black
              border border-gray-300 rounded-full
              shadow-sm
              focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
              transition duration-150 ease-in-out
            "
          >
            <Search className="w-6 h-6 text-gray-400 mr-3" strokeWidth={3} />
            <input
              type="text"
              placeholder="Search..."
              className="
                w-full 
                text-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none bg-transparent
              "
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-shrink-0 items-center gap-3">
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
