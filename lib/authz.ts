//@/lib/authz.ts
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export async function requireRole(roles: string[]) {
  const session = await getServerSession(authConfig);
  const role = session?.user?.role;
  if (!session || !role || !roles.includes(role)) {
    throw new Response("Forbidden", { status: 403 });
  }
}