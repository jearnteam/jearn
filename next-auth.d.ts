import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      uid?: string;
      provider?: string | null;
      provider_id?: string | null;
      picture?: string | null;
      bio?: string;
      role?: string;
    };
  }
}