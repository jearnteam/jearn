// components/common/HydrationGuard.tsx
"use client";

import { useEffect, useState } from "react";
import LoadingOwl from "@/components/LoadingOwl";

export default function HydrationGuard({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!hydrated) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-neutral-900">
        <div className="w-[200px] h-[200px] flex items-center justify-center">
          <LoadingOwl />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
