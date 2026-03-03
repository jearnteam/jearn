"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Activity, FileText } from "lucide-react";
import { LiveOnlineCounter } from "./LiveOnlineCounter";

type Stats = {
  totalUsers: number;
  dailyActiveUsers: number;
  totalPosts: number;
  newUsersToday: number;
};

export default function AboutJearnPage({
  onlineCount,
}: {
  onlineCount: number;
}) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-gray-500">
        Loading JEARN stats…
      </div>
    );
  }

  return (
    <div className="px-6 py-10 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">About JEARN</h1>
        <p className="text-gray-500 mt-2">
          Real-time activity and community statistics.
        </p>

        {/* Live indicator */}
        <LiveOnlineCounter count={onlineCount} />
      </div>

      {/* STAT GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard
          icon={<Users size={20} />}
          label="Total Users"
          value={stats.totalUsers}
        />

        <StatCard
          icon={<Activity size={20} />}
          label="Active Today"
          value={stats.dailyActiveUsers}
          highlight
        />

        <StatCard
          icon={<TrendingUp size={20} />}
          label="New Users Today"
          value={stats.newUsersToday}
        />

        <StatCard
          icon={<FileText size={20} />}
          label="Total Posts"
          value={stats.totalPosts}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        rounded-2xl p-5
        bg-neutral-100 dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-800
        flex flex-col gap-3
        ${highlight ? "ring-2 ring-blue-500/40" : ""}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="text-gray-500">{icon}</div>
      </div>

      <div className="text-3xl font-bold tracking-tight">
        {value.toLocaleString()}
      </div>

      <div className="text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </div>
    </motion.div>
  );
}
