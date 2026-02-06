import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

/**
 * 環境変数から管理者メールアドレスのリストを取得し、整形して返します。
 * キャッシュ効率のため、モジュールレベルで一度だけ実行されるようにしても良いですが、
 * Next.jsの環境変数の読み込みタイミングを考慮し、関数内で処理します。
 */
export function getAdminEmails(): string[] {
  const envValue = process.env.ADMIN_EMAILS || "";
  return envValue
    .split(",")
    .map((email) => email.trim()) // 空白を除去 (重要)
    .filter((email) => email.length > 0); // 空文字を除去
}

/**
 * 指定されたメールアドレスが管理者かどうかを判定します (Boolean)
 * UIの表示制御などに使います。
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email);
}

/**
 * APIルート用: 管理者かどうかを厳密にチェックします。
 * 管理者でない場合は例外(Response)を投げるか、nullを返して呼び出し元で処理させます。
 * ここでは、使い勝手を考慮して「セッションを返す」か「エラーResponseを投げる」形にします。
 */
export async function requireAdmin() {
  const session = await getServerSession(authConfig);

  // 1. ログインチェック
  if (!session?.user?.email) {
    // 呼び出し元で `catch` せずにそのままレスポンスとして扱えるよう
    // Next.js (App Router) では throw new Response が有効です
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. メールアドレスチェック
  if (!isAdminEmail(session.user.email)) {
    console.warn(`Admin access attempt blocked: ${session.user.email}`);
    throw new Response(JSON.stringify({ error: "Forbidden: Not an admin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session;
}
