import type { Post } from "@/types/post";

/* ---------------------------------------------
 * SEARCH MODES (tabs)
 * ------------------------------------------- */
export type SearchMode =
  | "all"
  | "posts"
  | "users"
  | "categories";

/* ---------------------------------------------
 * SEARCH ENTITIES
 * ------------------------------------------- */

export type SearchUser = {
  _id: string;
  userId: string | null;
  name: string;
  picture: string;
  bio?: string;
};

export type SearchCategory = {
  id: string;
  name: string;
  jname?: string;
  myname?: string;
};

/* ---------------------------------------------
 * MIXED SEARCH ITEM (single source of truth)
 * ------------------------------------------- */
export type SearchItem =
  | { type: "user"; data: SearchUser }
  | { type: "category"; data: SearchCategory }
  | { type: "post"; data: Post };
