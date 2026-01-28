import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      uid: string;
      provider?: string | null;
      provider_id?: string | null;
      picture?: string | null;
      bio?: string;
      role?: "user" | "admin";
    } & DefaultSession["user"];
  }
  interface User extends DefaultUser {
    role?: "admin" | "user"; // ✅ 追加
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    uid: string;
    provider?: string | null;
    provider_id?: string | null;
    role: "admin" | "user"; // ✅ 追加
  }
}
