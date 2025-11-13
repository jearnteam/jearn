"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DatabasePanel from "./DatabasePanel";
import AnalyticsPanel from "./AnalyticsPanel";
import ReportsPanel from "./ReportsPanel";
import { useTranslation } from "react-i18next";
import {
  Menu,
  X,
  Home,
  BarChart3,
  Database,
  Settings,
  Bell,
  FileBarChart,
} from "lucide-react";

export default function Dashboard() {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // NEW: Text appears only after expand finishes
  const [sidebarFullyOpen, setSidebarFullyOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "analytics"
    | "database"
    | "notification"
    | "reports"
    | "settings"
    | null
  >(null);

  const [hydrated, setHydrated] = useState(false);

  // Restore last selected tab
  useEffect(() => {
    const savedTab = localStorage.getItem("dashboard-active-tab");
    if (
      savedTab === "overview" ||
      savedTab === "analytics" ||
      savedTab === "database" ||
      savedTab === "settings"
    ) {
      setActiveTab(savedTab);
    } else {
      setActiveTab("overview");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (activeTab) localStorage.setItem("dashboard-active-tab", activeTab);
  }, [activeTab]);

  if (!hydrated || !activeTab)
    return (
      <div className="fixed inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading dashboard...
      </div>
    );

  return (
    <div className="fixed inset-0 pt-[4.3rem] bg-white dark:bg-black flex">
      {/* ---------- Sidebar ---------- */}
      <motion.aside
        animate={{ width: sidebarOpen ? 175 : 50 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onAnimationComplete={() => setSidebarFullyOpen(sidebarOpen)}
        className="
          relative h-full border-r border-gray-300 dark:border-neutral-800
          bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-gray-100
          overflow-hidden flex flex-col shadow-sm
        "
      >
        {/* Toggle button */}
        <button
          onClick={() => {
            if (sidebarOpen) {
              // Immediately hide text on closing
              setSidebarFullyOpen(false);
            }
            setSidebarOpen((v) => !v);
          }}
          className="
          absolute top-4 left-2 flex items-center justify-center w-8 h-8
          rounded-md bg-gray-200 dark:bg-neutral-800
         hover:bg-gray-300 dark:hover:bg-neutral-700
          text-gray-800 dark:text-gray-100 transition
          "
          aria-label="Toggle Sidebar"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="mt-16">
          <SidebarItem
            icon={<Home size={18} />}
            label={t("overview") || "Overview"}
            active={activeTab === "overview"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("overview")}
          />

          <SidebarItem
            icon={<BarChart3 size={18} />}
            label={t("analytics") || "Analytics"}
            active={activeTab === "analytics"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("analytics")}
          />

          <SidebarItem
            icon={<Database size={18} />}
            label={t("database") || "Database"}
            active={activeTab === "database"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("database")}
          />

          <SidebarItem
            icon={<Bell size={18} />}
            label={t("notification") || "Notification"}
            active={activeTab === "notification"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("notification")}
          />

          <SidebarItem
            icon={<FileBarChart size={18} />}
            label={t("reports") || "Reports"}
            active={activeTab === "reports"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("reports")}
          />

          <SidebarItem
            icon={<Settings size={18} />}
            label={t("settings") || "Settings"}
            active={activeTab === "settings"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </motion.aside>

      {/* ---------- Main Content ---------- */}
      <main className="flex-1 overflow-y-auto px-6 py-6 text-gray-900 dark:text-gray-100">
        {activeTab === "overview" && (
          <div>
            <h1 className="text-2xl font-bold mb-4">
              Welcome {session?.user?.name ?? "User"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              This is your overview dashboard.
            </p>
          </div>
        )}

        {activeTab === "analytics" && <AnalyticsPanel />}
        {activeTab === "database" && <DatabasePanel />}
        {activeTab === "reports" && <ReportsPanel />}
        {activeTab === "settings" && <p>Settings will be added here.</p>}
      </main>
    </div>
  );
}

/* ---------------- Sidebar Item ---------------- */
function SidebarItem({
  icon,
  label,
  active,
  sidebarFullyOpen,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  sidebarFullyOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-200 h-10
        ${
          active
            ? "bg-yellow-400 dark:bg-yellow-500 text-black"
            : "hover:bg-gray-200 dark:hover:bg-neutral-800"
        }`}
    >
      {icon}

      {/* Show label *only after* sidebar animations finish */}
      {sidebarFullyOpen && (
        <span className="text-sm opacity-100 transition-opacity duration-150">
          {label}
        </span>
      )}
    </div>
  );
}
