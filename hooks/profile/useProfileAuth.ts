import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useProfileAuth() {
  const router = useRouter();
  const { status } = useSession();

  const loading = status === "loading";

  useEffect(() => {
    if (!loading && status === "unauthenticated") {
      router.push("/");
    }
  }, [loading, status, router]);

  return { loading, authenticated: status === "authenticated" };
}
