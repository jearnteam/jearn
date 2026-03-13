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
      {/* ROADMAP */}
<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">JEARN Roadmap</h2>

  <div className="space-y-6">
    <Milestone
      title="Community Shop"
      description="A system where users can purchase coins to support JEARN and unlock visual customization features. Coins can be used to buy decorations, profile styles, post themes, and other cosmetic elements that personalize the user experience."
      status="Planned"
    />

    <Milestone
      title="User Billboard"
      description="Personalizable pages where users can promote their projects, portfolios, or learning journeys. These billboards allow creators to showcase their work directly to the JEARN community."
      status="Planned"
    />

    <Milestone
      title="AI Learning Assistant"
      description="AI-powered tools that help categorize posts, recommend learning resources, and assist users in discovering relevant knowledge across the platform."
      status="Research"
    />
  </div>
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

function Milestone({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: "Planned" | "Research" | "In Progress";
}) {
  return (
    <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{title}</div>

        <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">
          {status}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}