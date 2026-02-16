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
  FolderPlus,
} from "lucide-react";
import CategoryRequestsPanel from "./CategoryRequestPanel";

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
    | "categoryRequest"
    | null
  >(null);

  const [hydrated, setHydrated] = useState(false);

  const [notificationCounts, setNotificationCounts] = useState({
    reports: 0,
    category: 0,
  });

  function StatCard({ label, count }: { label: string; count: number }) {
    return (
      <div className="p-4 bg-white dark:bg-neutral-900 rounded shadow flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{count}</span>
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
      </div>
    );
  }

  async function loadNotifications() {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;

      const data = await res.json();
      setNotificationCounts(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30秒ごと
    return () => clearInterval(interval);
  }, []);

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
        {t("loadingDashboard")}...
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
            label={t("overview")}
            active={activeTab === "overview"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("overview")}
          />

          <SidebarItem
            icon={<BarChart3 size={18} />}
            label={t("analytics")}
            active={activeTab === "analytics"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("analytics")}
          />

          <SidebarItem
            icon={<Database size={18} />}
            label={t("database")}
            active={activeTab === "database"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("database")}
          />

          <SidebarItem
            icon={<Bell size={18} />}
            label={t("notification")}
            active={activeTab === "notification"}
            sidebarFullyOpen={sidebarFullyOpen}
            onClick={() => setActiveTab("notification")}
          />

          <SidebarItem
            icon={<FileBarChart size={18} />}
            label={t("reports")}
            active={activeTab === "reports"}
            sidebarFullyOpen={sidebarFullyOpen}
            badge={
              notificationCounts.reports > 0
                ? notificationCounts.reports
                : undefined
            }
            onClick={() => setActiveTab("reports")}
          />

          <SidebarItem
            icon={<FolderPlus size={18} />}
            label={t("categoryRequest")}
            active={activeTab === "categoryRequest"}
            sidebarFullyOpen={sidebarFullyOpen}
            badge={
              notificationCounts.category > 0
                ? notificationCounts.category
                : undefined
            }
            onClick={() => setActiveTab("categoryRequest")}
          />

          <SidebarItem
            icon={<Settings size={18} />}
            label={t("settings")}
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

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Pending Reports"
                count={notificationCounts.reports}
              />
              <StatCard
                label="Pending Categories"
                count={notificationCounts.category}
              />
              <StatCard label="Active Users" count={123} />
              <StatCard label="Posts Today" count={45} />
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
              <ul className="space-y-1">
                <li className="p-2 border rounded bg-gray-50 dark:bg-neutral-800">
                  Report #123 submitted by user A
                </li>
                <li className="p-2 border rounded bg-gray-50 dark:bg-neutral-800">
                  Category request "Test" approved
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "analytics" && <AnalyticsPanel />}
        {activeTab === "database" && <DatabasePanel />}
        {activeTab === "reports" && <ReportsPanel />}
        {activeTab === "categoryRequest" && <CategoryRequestsPanel />}
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
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  sidebarFullyOpen: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-200 h-10
        ${
          active
            ? "bg-yellow-400 dark:bg-yellow-500 text-black"
            : "hover:bg-gray-200 dark:hover:bg-neutral-800"
        }`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      {sidebarFullyOpen && (
        <span className="text-sm opacity-100 transition-opacity duration-150">
          {label}
        </span>
      )}
    </div>
  );
}
