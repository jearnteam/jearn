"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ---------- Types ---------- */
interface PostDoc {
  _id: string;
  parentId?: string | null;
  replyTo?: string | null;
  upvoteCount?: number;
  categories?: string[];
}

interface CategoryDoc {
  _id: string;
  label: string;
}

/* 🎨 Utility: evenly spaced dynamic colors */
function generateColors(count: number): string[] {
  const colors: string[] = [];
  const saturation = 70;
  const lightness = 55;
  for (let i = 0; i < count; i++) {
    const hue = Math.round((360 / count) * i);
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

export default function AnalyticsPanel() {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalComments: 0,
    totalReplies: 0,
    totalUpvotes: 0,
    categories: [] as { name: string; count: number }[],
  });
  const [loading, setLoading] = useState(true);

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

        const categoryCounts: Record<string, number> = {};
        postsOnly.forEach((p) => {
          p.categories?.forEach?.((c) => {
            categoryCounts[c] = (categoryCounts[c] || 0) + 1;
          });
        });

        const allCatsMerged = cats.map((cat) => ({
          name: cat.label,
          count: categoryCounts[cat.label] || 0,
        }));

        setStats({
          totalPosts: postsOnly.length,
          totalComments: commentsOnly.length,
          totalReplies: repliesOnly.length,
          totalUpvotes,
          categories: allCatsMerged,
        });
      } catch (err) {
        console.error("⚠️ Analytics fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 🎨 Assign fixed color per category (stable index)
  const colorMap = useMemo(() => {
    const colors = generateColors(stats.categories.length || 6);
    const map: Record<string, string> = {};
    stats.categories.forEach((c, i) => {
      map[c.name] = colors[i % colors.length];
    });
    return map;
  }, [stats.categories]);

  if (loading)
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Loading analytics...
      </div>
    );

  const nonEmptyCategories = stats.categories.filter((c) => c.count > 0);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold mb-2">Site Analytics</h1>

      {/* Summary metrics */}
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

      {/* 🟨 Bar Chart: All categories (including 0) */}
      {stats.categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Posts by Category (Including Empty)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.categories}>
              <XAxis dataKey="name" stroke="currentColor" />
              <YAxis stroke="currentColor" />
              <Tooltip
                contentStyle={{
                  background: "rgba(0,0,0,0.75)",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Bar dataKey="count" radius={8}>
                {stats.categories.map((c) => (
                  <Cell key={c.name} fill={colorMap[c.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 🟢 Pie Chart: Only non-empty categories (same color as bar) */}
      {nonEmptyCategories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Category Distribution (Non-Empty)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={nonEmptyCategories}
                dataKey="count"
                nameKey="name"
                outerRadius={110}
                label
              >
                {nonEmptyCategories.map((c) => (
                  <Cell key={c.name} fill={colorMap[c.name]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ---------- Reusable Metric Card ---------- */
function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-gray-100 dark:bg-neutral-800 text-center shadow">
      <div className="text-2xl font-bold text-yellow-500">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}
