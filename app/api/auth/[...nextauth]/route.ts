import NextAuth from "next-auth/next";
import { authConfig } from "@/features/auth/auth";

// ✅ Keep this line
const handler = NextAuth(authConfig);

// ✅ Export both route handlers (required by Next.js)
export { handler as GET, handler as POST };

// ✅ ALSO export the config as `authOptions`
export const authOptions = authConfig;
