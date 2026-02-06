"use client";

import Link from "next/link";
import { SearchItem } from "./types";

export default function SearchResultsList({
  results,
}: {
  results: SearchItem[];
}) {
  return (
    <ul className="space-y-4">
      {results.map((item, i) => {
        switch (item.type) {
          /* ---------------- USERS ---------------- */
          case "user":
            return (
              <li key={`user-${item.data._id}`}>
                <Link
                  href={`/users/${item.data.uniqueId}`}
                  className="
                    flex items-center gap-3
                    px-4 py-3 rounded-xl
                    border hover:bg-gray-50 dark:hover:bg-neutral-900
                  "
                >
                  <img
                    src={item.data.picture}
                    alt={item.data.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">
                      {item.data.name}
                    </div>
                    {item.data.uniqueId && (
                      <div className="text-xs text-gray-500">
                        @{item.data.uniqueId}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );

          /* ---------------- CATEGORIES ---------------- */
          case "category":
            return (
              <li key={`cat-${item.data.id}`}>
                <Link
                  href={`/category/${item.data.name}`}
                  className="
                    block px-4 py-3 rounded-xl
                    border hover:bg-gray-50 dark:hover:bg-neutral-900
                  "
                >
                  <div className="font-medium">
                    🏷️{" "}
                    {item.data.name ||
                      item.data.jname ||
                      item.data.myname}
                  </div>
                </Link>
              </li>
            );

          /* ---------------- POSTS ---------------- */
          case "post":
            return (
              <li key={`post-${item.data._id}`}>
                <Link
                  href={`/posts/${item.data._id}`}
                  className="
                    block px-4 py-4 rounded-xl
                    border hover:bg-gray-50 dark:hover:bg-neutral-900
                  "
                >
                  <div className="text-lg font-medium">
                    {item.data.title}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{item.data.authorName}</span>

                    {item.data.categories?.map((c) => (
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
  );
}
