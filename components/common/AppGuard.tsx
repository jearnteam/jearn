"use client";

import { useEffect, useState } from "react";
import LoadingOwl from "@/components/LoadingOwl";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function AppGuard({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const { loading: userLoading } = useCurrentUser();

  useEffect(() => {
    const id = setTimeout(() => setHydrated(true), 100); // slight delay to avoid flashes
    return () => clearTimeout(id);
  }, []);

  const appReady = hydrated && !userLoading;

  if (!appReady) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-neutral-900">
        <div className="w-28 h-28">
          <LoadingOwl />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
