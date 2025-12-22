"use client";

import { Plus, Home, Users, Bell, Banana } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

type HomeView = "home" | "notify" | "users" | "banana";

interface MobileNavbarProps {
  visible: boolean;
  activeView: HomeView;
  onChangeView: (view: HomeView) => void;
  onCreatePost: () => void;
  unreadCount?: number;
}

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
  const bananaRef = useRef<HTMLButtonElement | null>(null);

  /* ------------------------------------------------------------------ */
  /* indicator position                                                  */
  /* ------------------------------------------------------------------ */
  const [indicatorLeft, setIndicatorLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!navRef.current) return;

    const map: Record<HomeView, React.RefObject<HTMLButtonElement | null>> = {
      home: homeRef,
      users: usersRef,
      notify: notifyRef,
      banana: bananaRef,
    };

    const btn = map[activeView]?.current;
    if (!btn) return;

    const btnRect = btn.getBoundingClientRect();
    const navRect = navRef.current.getBoundingClientRect();

    // w-6 = 24px → 半分 12px
    setIndicatorLeft(btnRect.left - navRect.left + btnRect.width / 2 - 12);
  }, [activeView]);

  /* ------------------------------------------------------------------ */
  /* prevent touch scroll on nav                                         */
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
    const iconVariants = {
      active: { scale: 1.2, y: -2 },
      inactive: { scale: 1, y: 0 },
    };

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

        {/* badge */}
        {badge > 0 && (
          <span
            className="
              absolute -top-2 -right-3
              min-w-[18px] h-[18px]
              px-1
              rounded-full
              bg-blue-600 text-white
              text-[10px] leading-[18px]
              text-center
            "
          >
            {badge > 99 ? "99+" : badge}
          </span>
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
      initial={false}
      animate={{
        y: visible ? 0 : 96,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="
        lg:hidden fixed bottom-0 left-0 right-0
        h-20 bg-white dark:bg-black
        border-t border-neutral-200 dark:border-neutral-800
        flex items-center justify-evenly
        z-40 pt-1 pb-3 px-[5vw]
      "
    >
      <NavButton tab="home" icon={<Home size={24} />} buttonRef={homeRef} />

      <NavButton tab="users" icon={<Users size={24} />} buttonRef={usersRef} />

      {/* CREATE */}
      <button
        onClick={onCreatePost}
        className="
          w-12 h-12 bg-blue-600 rounded-full text-white
          flex items-center justify-center shadow-lg
        "
      >
        <Plus size={28} />
      </button>

      <NavButton
        tab="notify"
        icon={<Bell size={24} />}
        badge={unreadCount}
        buttonRef={notifyRef}
      />

      <NavButton
        tab="banana"
        icon={<Banana size={24} />}
        buttonRef={bananaRef}
      />

      {/* ✅ indicator は nav 直下で 1 個だけ */}
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
