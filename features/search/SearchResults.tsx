"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { SearchItem } from "./types";

export default function SearchResults({
  results,
  loading,
  visible,
}: {
  results: SearchItem[];
  loading: boolean;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      className="
        absolute top-full mt-2 w-full
        bg-white dark:bg-neutral-900
        border border-gray-200 dark:border-neutral-800
        rounded-2xl shadow-xl
        overflow-hidden z-50
      "
    >
      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching...
        </div>
      )}

      {/* RESULTS */}
      {!loading && results.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
          {results.map((item, i) => {
            switch (item.type) {
              /* ---------------- USERS ---------------- */
              case "user":
                return (
                  <li key={`u-${i}`}>
                    <Link
                      href={`/profile/${item.data.uniqueId ?? item.data._id}`}
                      className="
                        flex items-center gap-2
                        px-3 py-2
                        hover:bg-gray-100 dark:hover:bg-neutral-800
                      "
                    >
                      <img
                        src={item.data.picture}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.data.name}
                        </div>

                        {item.data.uniqueId && (
                          <div className="text-[11px] text-gray-500 truncate">
                            @{item.data.uniqueId}
                          </div>
                        )}
                        {item.data.bio && (
                          <div className="text-[11px] text-gray-400 truncate max-w-[220px]">
                            {item.data.bio}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );

              /* ---------------- CATEGORIES ---------------- */
              case "category":
                return (
                  <li key={`c-${i}`}>
                    <Link
                      href={`/category/${item.data.name}`}
                      className="
                        block px-4 py-3
                        hover:bg-gray-100 dark:hover:bg-neutral-800
                      "
                    >
                      <span className="font-medium">
                        🏷️{" "}
                        {item.data.name || item.data.jname || item.data.myname}
                      </span>
                    </Link>
                  </li>
                );

              /* ---------------- POSTS ---------------- */
              case "post":
                return (
                  <li key={`p-${item.data._id}`}>
                    <Link
                      href={`/posts/${item.data._id}`}
                      className="
                        block px-4 py-3
                        hover:bg-gray-100 dark:hover:bg-neutral-800
                      "
                    >
                      <div className="font-medium truncate">
                        {item.data.title}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{item.data.authorName}</span>

                        {item.data.categories?.slice(0, 3).map((c) => (
                          <span
                            key={c.id}
                            className="
                                px-2 py-0.5 rounded-full
                                bg-gray-100 dark:bg-neutral-800
                              "
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                );
            }
          })}
        </ul>
      )}

      {/* EMPTY */}
      {!loading && results.length === 0 && (
        <div className="px-4 py-4 text-sm text-gray-500">No results found</div>
      )}
    </div>
  );
}
