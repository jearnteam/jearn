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
      // ⚠️ Remove unless you *really* need cross-provider email merging
      // allowDangerousEmailAccountLinking: true,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  // ✅ JWT strategy (works fine once signIn is handled correctly)
  session: {
    strategy: "jwt",
  },

  callbacks: {
    /* ------------------------------------------------------
     * CREATE USER ON FIRST SIGN-IN
     * ---------------------------------------------------- */
    async signIn({ user, account }) {
      if (!user.email || !account) return false;

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);

      const existingUser = await db.collection("users").findOne({
        email: user.email,
      });

      if (!existingUser) {
        await db.collection("users").insertOne({
          name: user.name ?? "",
          email: user.email,
          image: user.image ?? null,

          provider: account.provider,
          provider_id: account.providerAccountId,

          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return true;
    },

    /* ------------------------------------------------------
     * JWT ENRICHMENT
     * ---------------------------------------------------- */
    async jwt({ token }) {
      if (!token.email) return token;

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);

      const user = await db.collection("users").findOne({
        email: token.email,
      });

      if (user) {
        token.uid = user._id.toString();
        token.provider = user.provider ?? null;
        token.provider_id = user.provider_id ?? null;
      }

      return token;
    },

    /* ------------------------------------------------------
     * SESSION ENRICHMENT (CLIENT ACCESS)
     * ---------------------------------------------------- */
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
