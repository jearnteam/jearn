"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Home, BarChart3, Database, Settings } from "lucide-react";
import DatabasePanel from "./DatabasePanel";
import AnalyticsPanel from "./AnalyticsPanel";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { data: session } = useSession();
  const { t } = useTranslation();

  // ✅ Start with sidebar closed
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Default tab is undefined until hydration finishes
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "database" | "settings" | null
  >(null);

  const [hydrated, setHydrated] = useState(false);

  // ✅ Restore last tab on mount
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
      setActiveTab("overview"); // fallback for first visit
    }
    setHydrated(true);
  }, []);

  // ✅ Save tab changes
  useEffect(() => {
    if (activeTab) localStorage.setItem("dashboard-active-tab", activeTab);
  }, [activeTab]);

  // 🕒 Avoid showing flash of “database” before hydration
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
        animate={{ width: sidebarOpen ? 240 : 50 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="
          relative h-full border-r border-gray-300 dark:border-neutral-800
          bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-gray-100
          overflow-hidden flex flex-col shadow-sm
        "
      >
        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
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
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("overview")}
          />
          <SidebarItem
            icon={<BarChart3 size={18} />}
            label={t("analytics") || "Analytics"}
            active={activeTab === "analytics"}
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("analytics")}
          />
          <SidebarItem
            icon={<Database size={18} />}
            label={t("database") || "Database"}
            active={activeTab === "database"}
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("database")}
          />
          <SidebarItem
            icon={<Settings size={18} />}
            label={t("settings") || "Settings"}
            active={activeTab === "settings"}
            sidebarOpen={sidebarOpen}
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
  sidebarOpen,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  sidebarOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-200
        ${
          active
            ? "bg-yellow-400 dark:bg-yellow-500 text-black"
            : "hover:bg-gray-200 dark:hover:bg-neutral-800"
        }`}
    >
      {icon}
      {sidebarOpen && <span className="text-sm">{label}</span>}
    </div>
  );
}
