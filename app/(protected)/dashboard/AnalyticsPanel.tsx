"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ---------- Types ---------- */
interface PostDoc {
  _id: string;
  parentId?: string | null;
  replyTo?: string | null;
  upvoteCount?: number;
  categories?: string[];
  createdAt?: string;
}

interface CategoryDoc {
  _id: string;
  label: string;
}

export default function AnalyticsPanel() {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalComments: 0,
    totalReplies: 0,
    totalUpvotes: 0,
    categories: [] as { name: string; count: number }[],
    dailyPosts: [] as {
      date: string;
      daily: number;
      cumulative: number;
      movingAvg: number;
    }[],
  });

  const [viewMode, setViewMode] = useState<"daily" | "cumulative">("daily");
  const [loading, setLoading] = useState(true);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  useEffect(() => {
    async function fetchData() {
      try {
        const [postRes, catRes] = await Promise.all([
          fetch("/api/admin/all-posts"),
          fetch("/api/categories"),
        ]);

        const posts: PostDoc[] = await postRes.json();
        const cats: CategoryDoc[] = await catRes.json();

        const postsOnly = posts.filter((p) => !p.parentId && !p.replyTo);
        const commentsOnly = posts.filter((p) => p.parentId && !p.replyTo);
        const repliesOnly = posts.filter((p) => !!p.replyTo);

        const totalUpvotes = posts.reduce(
          (sum, p) => sum + (p.upvoteCount || 0),
          0
        );

        const dailyMap: Record<string, number> = {};

        postsOnly.forEach((p) => {
          if (!p.createdAt) return;
          const date = new Date(p.createdAt).toISOString().slice(0, 10);
          dailyMap[date] = (dailyMap[date] || 0) + 1;
        });

        const sortedDaily = Object.entries(dailyMap)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        let runningTotal = 0;

        const cumulativeData = sortedDaily.map((item) => {
          runningTotal += item.count;
          return {
            date: item.date,
            daily: item.count,
            cumulative: runningTotal,
          };
        });

        const withMovingAverage = cumulativeData.map((item, index, arr) => {
          const start = Math.max(0, index - 6);
          const slice = arr.slice(start, index + 1);
          const avg = slice.reduce((sum, d) => sum + d.daily, 0) / slice.length;

          return {
            ...item,
            movingAvg: Number(avg.toFixed(2)),
          };
        });

        const categoryCounts: Record<string, number> = {};

        postsOnly.forEach((p) => {
          p.categories?.forEach((c) => {
            const key = String(c);
            categoryCounts[key] = (categoryCounts[key] || 0) + 1;
          });
        });

        const allCatsMerged = cats.map((cat) => ({
          name: cat.label,
          count: categoryCounts[String(cat._id)] || 0,
        }));

        setStats({
          totalPosts: postsOnly.length,
          totalComments: commentsOnly.length,
          totalReplies: repliesOnly.length,
          totalUpvotes,
          categories: allCatsMerged.sort((a, b) => b.count - a.count),
          dailyPosts: withMovingAverage,
        });
      } catch (err) {
        console.error("Analytics fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const total = stats.categories.length;

    stats.categories.forEach((c, i) => {
      const ratio = total > 1 ? i / (total - 1) : 0;

      if (isDark) {
        const lightness = 75 - ratio * 40;
        map[c.name] = `hsl(0, 0%, ${lightness}%)`;
      } else {
        const lightness = 25 + ratio * 45;
        map[c.name] = `hsl(0, 0%, ${lightness}%)`;
      }
    });

    return map;
  }, [stats.categories, isDark]);

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-12 px-8 py-10 bg-gray-50 dark:bg-neutral-950 min-h-screen text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-semibold tracking-tight">Site Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Posts" value={stats.totalPosts} />
        <MetricCard label="Comments" value={stats.totalComments} />
        <MetricCard label="Replies" value={stats.totalReplies} />
        <MetricCard
          label="Total Discuss"
          value={stats.totalComments + stats.totalReplies}
        />
        <MetricCard label="Upvotes" value={stats.totalUpvotes} />
      </div>

      {stats.dailyPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Post Growth</h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.dailyPosts}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />

              {viewMode === "daily" ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="daily"
                    stroke="#6b7280"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke="#9ca3af"
                    strokeWidth={3}
                    dot={false}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#374151"
                  strokeWidth={3}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats.categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Categories</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.categories}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.categories.map((c) => (
                  <Cell key={c.name} fill={colorMap[c.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </div>
    </div>
  );
}
