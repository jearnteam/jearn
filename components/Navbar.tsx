"use client";

import dynamic from "next/dynamic";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import UserMenu from "@/components/UserMenu";
import { useState, useEffect, useRef, memo } from "react";
import { Search } from "lucide-react";
import { useSearch } from "@/features/search/useSearch";
import SearchResults from "@/components/search/SearchResults";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSearchHistory } from "@/features/search/useSearchHistory";
import { SearchItem } from "@/types/search";

const ThreeBall = dynamic(() => import("./3d_spinner/3d_spinner"), {
  ssr: false,
  loading: () => null,
});

const MemoUserMenu = memo(UserMenu);

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { history, save } = useSearchHistory();
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  /* ---------------------------------------------
   * STATE
   * ------------------------------------------- */
  const [mounted, setMounted] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  const navbarRef = useRef<HTMLElement | null>(null);

  const router = useRouter();
  const [query, setQuery] = useState("");
  const { results, loading: searchLoading } = useSearch(query);

  /* ---------------------------------------------
   * HYDRATION GATE
   * ------------------------------------------- */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ---------------------------------------------
   * LAYOUT MODE (matches HomePage < lg)
   * ------------------------------------------- */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)"); // < lg
    const update = () => setIsCompactLayout(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const searchActive = isCompactLayout && searchFocused;

  /* ---------------------------------------------
   * PREVENT TOUCH SCROLL
   * ------------------------------------------- */
  useEffect(() => {
    const el = navbarRef.current;
    if (!el) return;

    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const filteredHistory = query.trim()
    ? history.filter((h) => h.toLowerCase().includes(query.toLowerCase()))
    : history.slice(0, 3);

  type HistoryItem = {
    type: "history";
    data: {
      id: string;
      label: string;
    };
  };

  type ExtendedItem = SearchItem | HistoryItem;

  const historyItems: HistoryItem[] = filteredHistory.map((h) => ({
    type: "history",
    data: {
      id: h,
      label: h,
    },
  }));

  const combinedList: ExtendedItem[] = [...historyItems, ...results];

  const performSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;

    save(trimmed);
    closeSearch();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const closeSearch = () => {
    setQuery("");
    setSearchFocused(false);
    setActiveIndex(-1);
    // remove focus from input
    inputRef.current?.blur();
  };

  const goHome = () => {
    closeSearch();            // close search overlay
    document.activeElement instanceof HTMLElement &&
      document.activeElement.blur(); // remove any focus
    router.push("/");
  };

  /* ---------------------------------------------
   * SSR SAFE SHELL
   * ------------------------------------------- */
  if (!mounted) {
    return (
      <header className="fixed top-0 left-0 w-full h-16 bg-white dark:bg-neutral-900 border-b shadow-sm" />
    );
  }

  /* ---------------------------------------------
   * RENDER
   * ------------------------------------------- */
  return (
    <header
      ref={navbarRef}
      className="fixed top-0 left-0 w-full h-16 z-50 bg-white dark:bg-neutral-900 border-b shadow-sm"
    >
      <div className="relative h-full px-4 flex items-center">
        {/* LEFT — LOGO */}
        <div
          className={`
            flex items-center gap-3 cursor-pointer
            transition-opacity duration-200
            ${searchActive ? "opacity-0 pointer-events-none" : ""}
          `}
          onClick={() => {
            if (isHome) {
              window.location.reload();
            } else {
              goHome();
            }
          }}
        >
          <div className="w-12 h-12 flex items-center justify-center">
            {isHome ? (
              <ThreeBall />
            ) : (
              <button
                onClick={() => router.back()}
                aria-label="Go back"
                className="
                  flex items-center justify-center
                  w-10 h-10 rounded-full
                  hover:bg-gray-100 dark:hover:bg-neutral-800
                  transition-colors
                "
              >
                <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
              </button>
            )}
          </div>

          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-shadows-into-light)" }}
          >
            {t("jearn")}
          </h1>
        </div>

        {/* CENTER — SEARCH */}
        <div
          className={`
            transition-all duration-300 ease-out
            ${
              searchActive
                ? "absolute inset-0 h-full flex items-center px-4 z-50"
                : isCompactLayout
                ? "relative flex-1 mx-4"
                : "absolute left-1/2 -translate-x-1/2 w-[520px]"
            }
          `}
        >
          <div className="relative w-full">
            {/* INPUT */}
            <div
              className="
                flex items-center w-full
                px-4 py-3 lg:py-2
                bg-white dark:bg-black
                border border-gray-300
                rounded-full shadow-sm
              "
            >
              <button
                type="button"
                aria-label="Search"
                onClick={() => {
                  // If not focused → focus input
                  if (document.activeElement !== inputRef.current) {
                    inputRef.current?.focus();
                    setSearchFocused(true);
                    return;
                  }

                  // If focused & valid query → go to search page
                  if (query.trim().length >= 2) {
                    router.push(`/search?q=${encodeURIComponent(query)}`);
                    setSearchFocused(false);
                  }
                }}
                className="
                  flex items-center justify-center
                  mr-3
                  text-gray-400
                  hover:text-gray-600 dark:hover:text-gray-300
                "
              >
                <Search className="w-5 h-5" strokeWidth={3} />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  const total = combinedList.length;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (activeIndex < total - 1) {
                      setActiveIndex(activeIndex + 1);
                    }
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (activeIndex > 0) {
                      setActiveIndex(activeIndex - 1);
                    } else {
                      // leave the list (back to input)
                      setActiveIndex(-1);
                    }
                  }

                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (activeIndex >= 0 && combinedList[activeIndex]) {
                      const item = combinedList[activeIndex];

                      if (item.type === "history") {
                        closeSearch();
                        performSearch(item.data.label);
                        return;
                      }

                      // Save searchable label before navigating
                      if (item.type === "post") {
                        save(item.data.title ?? "");
                        closeSearch();
                        router.push(`/posts/${item.data._id}`);
                        return;
                      }

                      if (item.type === "user") {
                        save(item.data.name);
                        closeSearch();
                        router.push(`/profile/${item.data._id}`);
                        return;
                      }

                      if (item.type === "category") {
                        save(item.data.name);
                        closeSearch();
                        router.push(`/category/${item.data.name}`);
                        return;
                      }
                    } else {
                      performSearch(query);
                    }
                  }
                }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
                className="
                  w-full bg-transparent
                  text-gray-700 dark:text-gray-100
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none
                "
              />
            </div>

            {/* RESULTS */}
            <SearchResults
              results={results}
              loading={searchLoading}
              visible={searchFocused}
              query={query}
              history={history}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              onSelectItem={(item) => {
                if (item.type === "history") {
                  performSearch(item.data.label);
                  return;
                }

                if (item.type === "post") {
                  save(item.data.title ?? "");
                  closeSearch();
                  router.push(`/posts/${item.data._id}`);
                  return;
                }

                if (item.type === "user") {
                  save(item.data.name);
                  closeSearch();
                  router.push(`/profile/${item.data._id}`);
                  return;
                }

                if (item.type === "category") {
                  save(item.data.name);
                  closeSearch();
                  router.push(`/category/${item.data.name}`);
                  return;
                }
              }}
            />
          </div>
        </div>

        {/* RIGHT — USER */}
        <div
          className={`
            ml-auto flex items-center gap-3
            transition-opacity duration-200
            ${searchActive ? "opacity-0 pointer-events-none" : ""}
          `}
        >
          {loading ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("loading")}...
            </span>
          ) : user ? (
            <MemoUserMenu user={user} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
