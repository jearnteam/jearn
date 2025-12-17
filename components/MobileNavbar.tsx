"use client";

import { Plus, Home, Users, Bell, Banana } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useEffect } from "react";

type HomeView = "home" | "notify" | "users" | "banana";

interface MobileNavbarProps {
  visible: boolean;
  activeView: HomeView;
  onChangeView: (view: HomeView) => void;
  onCreatePost: () => void;
  unreadCount?: number; // ✅ add
}

export default function MobileNavbar({
  visible,
  activeView,
  onChangeView,
  onCreatePost,
  unreadCount = 0,
}: MobileNavbarProps) {
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const prevent = (e: TouchEvent) => {
      e.preventDefault();
    };

    el.addEventListener("touchmove", prevent, { passive: false });

    return () => {
      el.removeEventListener("touchmove", prevent);
    };
  }, []);

  function NavButton({
    tab,
    icon,
    badge = 0,
  }: {
    tab: HomeView;
    icon: React.ReactNode;
    badge?: number;
  }) {
    const isActive = activeView === tab;

    return (
      <button
        onClick={() => onChangeView(tab)}
        className="relative w-16 h-12 flex items-center justify-center"
      >
        <div className="relative w-6 h-6 flex items-center justify-center">
          <motion.div
            animate={{
              scale: isActive ? 1.2 : 1,
              y: isActive ? -2 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className={
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400"
            }
          >
            {icon}
          </motion.div>

          {/* ✅ UNREAD BADGE */}
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

          {isActive && (
            <motion.div
              layoutId="nav-indicator"
              className="
                absolute
                top-full mt-1
                inset-x-0 mx-auto
                h-[2px] w-6
                rounded-full
                bg-blue-600 dark:bg-blue-400
              "
              animate={{
                scaleX: [1, 1.35, 1],
                scaleY: [1, 0.8, 1],
              }}
              transition={{
                layout: { type: "spring", stiffness: 420, damping: 30 },
                duration: 0.35,
              }}
            />
          )}
        </div>
      </button>
    );
  }

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
      <NavButton tab="home" icon={<Home size={24} />} />
      <NavButton tab="users" icon={<Users size={24} />} />

      {/* CREATE */}
      <button
        onClick={onCreatePost}
        className="w-12 h-12 bg-blue-600 rounded-full text-white
                   flex items-center justify-center shadow-lg"
      >
        <Plus size={28} />
      </button>

      {/* ✅ pass badge only to notify */}
      <NavButton tab="notify" icon={<Bell size={24} />} badge={unreadCount} />

      <NavButton tab="banana" icon={<Banana size={24} />} />
    </motion.nav>
  );
}
