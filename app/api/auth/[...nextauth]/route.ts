import NextAuth from "next-auth";
import { authConfig } from "@/features/auth/auth";

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
