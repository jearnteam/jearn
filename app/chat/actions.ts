"use server";

import { revalidatePath } from "next/cache";

export async function refreshHome() {
  // re-run data fetch for `/`
  revalidatePath("/");
}
