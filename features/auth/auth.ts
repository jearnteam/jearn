import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { AuthOptions } from "next-auth";

export const authConfig: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          scope: "openid email profile",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token }) {
      if (!token.email) return token;

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);

      const user = await db
        .collection("users")
        .findOne({ email: token.email });

      if (user) {
        token.uid = user._id.toString();
        token.provider = user.provider ?? null;
        token.provider_id = user.provider_id ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.uid = token.uid as string;
        session.user.provider = token.provider as string | null;
        session.user.provider_id = token.provider_id as string | null;
      }
      return session;
    },
  },
};
