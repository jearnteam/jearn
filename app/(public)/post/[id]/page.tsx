// app/(public)/posts/[id]/page.tsx

import { redirect, notFound } from "next/navigation";
import { authConfig } from "@/features/auth/auth";
import PublicPostClient from "./PublicPostClient";
import { getServerSession } from "next-auth";

interface PageProps {
  params: { id: string };
}

export default async function Page({ params }: PageProps) {
  const session = await getServerSession(authConfig);

  // 🔁 If logged in → go to authenticated route instantly
  if (session) {
    redirect(`/posts/${params.id}`);
  }

  if (!params.id) {
    notFound();
  }

  return <PublicPostClient id={params.id} />;
}
