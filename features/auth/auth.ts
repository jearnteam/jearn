import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";
import type { AuthOptions, SessionStrategy } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: { strategy: "jwt" as SessionStrategy },

  callbacks: {
    // 🟢 1. On sign-in or first login
    async signIn({ user, account }) {
      try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const now = new Date();

        // Check if user exists already
        const existingUser = await db
          .collection("users")
          .findOne({ email: user.email });

        const updateFields = {
          provider: account?.provider ?? "google",
          provider_id: account?.providerAccountId,
          email: user.email,
          email_verified: true,
          updatedAt: now,
        };

        const insertFields = {
          createdAt: now,
          bio: "",
          name: user.name || null, // ✅ Only set on first login
          picture: null, // user uploads later
          pictureMime: "image/jpeg",
        };

        await db.collection("users").updateOne(
          { email: user.email },
          existingUser
            ? { $set: updateFields } // ✅ Skip setting name if user exists
            : { $set: updateFields, $setOnInsert: insertFields },
          { upsert: true }
        );

        return true;
      } catch (err) {
        console.error("❌ Error saving user:", err);
        return false;
      }
    },

    // 🧠 2. Whenever the JWT is created or refreshed
    async jwt({ token, account }): Promise<JWT> {
      try {
        // force-cast because token is `unknown` by default
        const t = token as Record<string, any>;

        if (account) {
          t.provider = account.provider;
          t.provider_id = account.providerAccountId;
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const existing = await db
          .collection("users")
          .findOne({ email: t.email });

        if (existing) {
          t.uid = existing._id.toString();
          t.provider = existing.provider;
          t.provider_id = existing.provider_id;
          t.bio = existing.bio ?? "";
          t.picture = existing.picture
            ? `/api/user/avatar/${existing._id.toString()}`
            : null;
        } else {
          t.picture = null;
        }

        return t as JWT;
      } catch (err) {
        console.error("❌ JWT callback error:", err);
        return token;
      }
    },

    // 🟡 3. Shape of the session returned to the client
    async session({ session }) {
      if (session.user?.email) {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const user = await db
          .collection("users")
          .findOne({ email: session.user.email });

        if (user) {
          session.user.uid = user._id.toString();
          session.user.name = user.name ?? session.user.name;
          session.user.bio = user.bio ?? "";
          session.user.picture = user.picture
            ? `/api/user/avatar/${user._id}?t=${Date.now()}`
            : null;
          session.user.provider = user.provider;
          session.user.provider_id = user.provider_id;
        }
      }
      return session;
    },
  },
};
