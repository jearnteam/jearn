//@/lib/authz.ts
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export async function requireRole(roles: string[]) {
  const session = await getServerSession(authConfig);
  const role = (session as any)?.role;
  if (!session || !roles.includes(role)) {
    throw new Response("Forbidden", { status: 403 });
  }
}