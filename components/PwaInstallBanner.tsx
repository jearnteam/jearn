"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  //delete the localstorage for testing (have to remove at the production)
  //useEffect(() => {
  //  localStorage.removeItem("pwa-banner-dismissed");
  //}, []);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    const isMobile = window.innerWidth < 768;
    const dismissed = localStorage.getItem("pwa-banner-dismissed");

    if (pathname !== "/") return;
    if (isPWA || !isMobile) return;

    if (dismissed) {
      const diff = Date.now() - Number(dismissed);
      if (diff < 24 * 60 * 60 * 1000) return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="
        fixed top-16 left-0 right-0 z-40
        bg-blue-600 text-white
        px-4 py-3
        flex items-center justify-between gap-3
        shadow-md
      "
    >
      <div className="text-sm leading-tight">
        {isIOS ? "Add JEARN to Home Screen 📲" : "Install JEARN app 🚀"}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={async () => {
            if (deferredPrompt) {
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
              setVisible(false);
            } else {
              router.push("/posts/69ce283ea7f94f51417fbf94");
            }
          }}
          className="bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-semibold"
        >
          Install
        </button>

        <button
          onClick={() => {
            localStorage.setItem(
              "pwa-banner-dismissed",
              Date.now().toString()
            );
            setVisible(false);
          }}
          className="text-white/80 text-sm"
          aria-label="Dismiss install banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}