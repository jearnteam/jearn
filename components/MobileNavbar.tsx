"use client";

import { Plus, Home, Users, Bell, Banana } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import { useUpload } from "@/components/upload/UploadContext";

type HomeView = "home" | "notify" | "users" | "videos";

interface MobileNavbarProps {
  visible: boolean;
  activeView: HomeView;
  onChangeView: (view: HomeView) => void;
  onCreatePost: () => void;
  unreadCount?: number;
}

/* ------------------------------------------------------------------ */
/* icon animation variants                                            */
/* ------------------------------------------------------------------ */
const iconVariants = {
  active: { scale: 1.2, y: -2 },
  inactive: { scale: 1, y: 0 },
};

export default function MobileNavbar({
  visible,
  activeView,
  onChangeView,
  onCreatePost,
  unreadCount = 0,
}: MobileNavbarProps) {
  /* ------------------------------------------------------------------ */
  /* refs                                                               */
  /* ------------------------------------------------------------------ */
  const navRef = useRef<HTMLElement | null>(null);

  const homeRef = useRef<HTMLButtonElement | null>(null);
  const usersRef = useRef<HTMLButtonElement | null>(null);
  const notifyRef = useRef<HTMLButtonElement | null>(null);
  const videosRef = useRef<HTMLButtonElement | null>(null);
  const { uploading, progress } = useUpload();

  /* ------------------------------------------------------------------ */
  /* indicator                                                          */
  /* ------------------------------------------------------------------ */
  const [indicatorLeft, setIndicatorLeft] = useState<number | null>(null);

  /* ------------------------------------------------------------------ */
  /* indicator position calc                                            */
  /* ------------------------------------------------------------------ */
  const updateIndicator = useCallback(() => {
    if (!navRef.current) return;

    const map: Record<HomeView, React.RefObject<HTMLButtonElement | null>> = {
      home: homeRef,
      users: usersRef,
      notify: notifyRef,
      videos: videosRef,
    };

    const btn = map[activeView]?.current;
    if (!btn) return;

    const btnRect = btn.getBoundingClientRect();
    const navRect = navRef.current.getBoundingClientRect();

    // indicator width = 24px → half = 12px
    setIndicatorLeft(btnRect.left - navRect.left + btnRect.width / 2 - 12);
  }, [activeView]);

  /* ------------------------------------------------------------------ */
  /* recalc indicator                                                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    window.addEventListener("orientationchange", updateIndicator);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      window.removeEventListener("orientationchange", updateIndicator);
    };
  }, [updateIndicator]);

  /* ------------------------------------------------------------------ */
  /* prevent touch scroll                                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });

    return () => {
      el.removeEventListener("touchmove", prevent);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* NavButton                                                           */
  /* ------------------------------------------------------------------ */
  function NavButton({
    tab,
    icon,
    badge = 0,
    buttonRef,
  }: {
    tab: HomeView;
    icon: React.ReactNode;
    badge?: number;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
  }) {
    const isActive = activeView === tab;

    return (
      <button
        ref={buttonRef}
        onClick={() => onChangeView(tab)}
        className="relative w-16 h-12 flex items-center justify-center"
      >
        <motion.div
          variants={iconVariants}
          animate={isActive ? "active" : "inactive"}
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          className={
            isActive
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }
        >
          {icon}
        </motion.div>

        {/* unread badge */}

        {tab === "notify" && badge > 0 && (
          <motion.span
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="
              absolute -top-[2px] -right-[2px]
              h-[18px] min-w-[18px]
              rounded-full
              bg-red-600 text-white
              text-[10px] font-semibold
              inline-flex items-center justify-center
              leading-none
              shadow-[0_0_0_2px_white]
              dark:shadow-[0_0_0_2px_black]
            "
          >
            <span className="relative top-[0.5px]">
              {badge > 99 ? "99+" : badge}
            </span>
          </motion.span>
        )}
      </button>
    );
  }

  /* ------------------------------------------------------------------ */
  /* render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <motion.nav
      ref={navRef}
      style={{
        ["--mobile-navbar-h" as any]: "80px",
      }}
      className="
    lg:hidden fixed bottom-0 left-0 right-0
    h-20
    bg-white dark:bg-black
    border-t border-neutral-200 dark:border-neutral-800
    flex items-center justify-evenly
    z-40 pt-1 pb-3 px-[5vw]
  "
    >
      <NavButton tab="home" icon={<Home size={24} />} buttonRef={homeRef} />

      <NavButton tab="users" icon={<Users size={24} />} buttonRef={usersRef} />

      {/* CREATE */}
      <button
        onClick={uploading ? undefined : onCreatePost}
        className="
    relative w-12 h-12 rounded-full text-white
    flex items-center justify-center shadow-lg overflow-hidden
    bg-blue-600 disabled:opacity-70
  "
      >
        {/* progress pie */}
        {uploading && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="22"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="22"
              stroke="white"
              strokeWidth="4"
              fill="none"
              strokeDasharray={138.2}
              strokeDashoffset={138.2 - (progress / 100) * 138.2}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* icon */}
        <Plus size={28} className={uploading ? "opacity-40" : ""} />
      </button>

      <NavButton
        tab="notify"
        icon={<Bell size={24} />}
        badge={unreadCount}
        buttonRef={notifyRef}
      />

      <NavButton
        tab="videos"
        icon={<Banana size={24} />}
        buttonRef={videosRef}
      />

      {/* indicator */}
      {indicatorLeft !== null && (
        <motion.div
          layoutId="nav-indicator"
          initial={false}
          className="
            absolute bottom-5
            h-[2px] w-6
            rounded-full
            bg-blue-600 dark:bg-blue-400
          "
          style={{ left: indicatorLeft }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 30,
          }}
        />
      )}
    </motion.nav>
  );
}
