import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { AuthOptions } from "next-auth";

// 管理者メールアドレスのリストを事前にパース
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

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
        // ※ ここで初期roleをDBに入れたい場合は role: "user" などを追加可能
        await db.collection("users").insertOne({
          name: user.name ?? "",
          email: user.email,
          avatarUrl: user.image ?? null,
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

      // Userが見つかった場合に情報を付与
      if (user) {
        token.uid = user._id.toString();
        token.name = user.name;
        token.provider = user.provider ?? null;
        token.provider_id = user.provider_id ?? null;
      }

      // ✅ Role判定: ADMIN_EMAILSに含まれていれば 'admin'、それ以外は 'user'
      const isAdmin = adminEmails.includes(token.email);
      token.role = isAdmin ? "admin" : "user";

      return token;
    },

    /* ------------------------------------------------------
     * SESSION ENRICHMENT (CLIENT ACCESS)
     * ---------------------------------------------------- */
    async session({ session, token }) {
      // next-auth.d.ts で型拡張しているので、プロパティが存在することが保証される
      if (session.user) {
        session.user.uid = token.uid;
        session.user.name = token.name;
        session.user.provider = token.provider ?? null;
        session.user.provider_id = token.provider_id ?? null;

        // ✅ JWTからSessionへRoleをコピー
        session.user.role = token.role;
      }

      return session;
    },
  },
};
