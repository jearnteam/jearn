"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";

interface Reporter {
  userId: string;
  reason: string;
  date: string;
}

interface Report {
  _id: string;
  postId: string;
  status: "pending" | "reviewed" | "ignored";
  reporters: Reporter[];
  createdAt?: string;
}

export default function ReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "reviewed" | "ignored">(
    "all"
  );

  /* ---------------- Load Reports ---------------- */
  const loadReports = async () => {
    setLoading(true);
    const res = await fetch("/api/reports");
    const data = await res.json();
    setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  /* ---------------- Update Status ---------------- */
  async function updateStatus(id: string, status: Report["status"]) {
    // Optimistic update
    setReports((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status } : r))
    );

    try {
      await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  /* ---------------- Delete Report ---------------- */
  async function deleteReport(id: string) {
    if (!confirm("Delete this report?")) return;

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete report");
        return;
      }

      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error("Failed to delete report:", err);
      alert("Failed to delete report");
    }
  }

  /* ---------------- Open Report + Load Post ---------------- */
  async function openReport(report: Report) {
    setSelectedReport(report);
    setSelectedPost(null);

    try {
      const res = await fetch(`/api/posts/${report.postId}`);
      const data = await res.json();
      setSelectedPost(data);
    } catch (err) {
      console.error("Failed to fetch post:", err);
    }
  }

  /* ---------------- Filtering ---------------- */
  const filteredReports =
    filterStatus === "all"
      ? reports
      : reports.filter((r) => r.status === filterStatus);

  if (loading)
    return <p className="text-gray-500 dark:text-gray-400">Loading reports…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm">Filter by status:</label>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as typeof filterStatus)
          }
          className="border px-2 py-1 rounded dark:bg-neutral-900 dark:border-neutral-700"
        >
          <option value="all">All</option>
          <option value="pending">Not Reviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="ignored">Ignored</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border dark:border-neutral-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-neutral-800">
            <tr>
              <th className="px-3 py-2 text-left">Post ID</th>
              <th className="px-3 py-2 text-left">Reporters</th>
              <th className="px-3 py-2 text-left">Reason (summary)</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredReports.map((r) => {
              const reporterCount = r.reporters?.length ?? 0;
              const firstReason = r.reporters?.[0]?.reason ?? "";
              const extraCount = Math.max(0, reporterCount - 1);

              return (
                <tr
                  key={r._id}
                  className="border-t dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  {/* Post ID */}
                  <td
                    className="px-3 py-2 cursor-pointer truncate"
                    onClick={() => openReport(r)}
                  >
                    {r.postId}
                  </td>

                  {/* Reporters */}
                  <td
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => openReport(r)}
                  >
                    {reporterCount} user{reporterCount === 1 ? "" : "s"}
                  </td>

                  {/* Reason summary */}
                  <td
                    className="px-3 py-2 cursor-pointer truncate"
                    onClick={() => openReport(r)}
                  >
                    {firstReason}
                    {extraCount > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        (+{extraCount} more)
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    <select
                      value={r.status}
                      onChange={(e) =>
                        updateStatus(r._id, e.target.value as Report["status"])
                      }
                      className="border px-2 py-1 rounded dark:bg-neutral-900 dark:border-neutral-700 w-full"
                    >
                      <option value="pending">Not Reviewed</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="ignored">Ignored</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteReport(r._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredReports.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-6 text-gray-500 dark:text-gray-400"
                >
                  No reports found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Post Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-lg p-6 relative shadow-xl">
            <button
              onClick={() => {
                setSelectedReport(null);
                setSelectedPost(null);
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-300"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold mb-4">Report Details</h2>

            <p className="text-sm mb-2">
              <strong>Post ID:</strong> {selectedReport.postId}
            </p>

            {/* Reporters list */}
            <div className="mt-3 mb-4">
              <h3 className="font-semibold mb-2 text-sm">Reporters</h3>
              {selectedReport.reporters?.map((rep) => (
                <div
                  key={rep.userId + rep.date}
                  className="p-2 rounded bg-gray-100 dark:bg-neutral-800 mb-2"
                >
                  <p className="text-xs">
                    <strong>User:</strong> {rep.userId}
                  </p>
                  <p className="text-xs">
                    <strong>Reason:</strong> {rep.reason}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {new Date(rep.date).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold mb-2">Post Preview</h3>

            {!selectedPost && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Loading post…
              </p>
            )}

            {selectedPost && (
              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 max-h-[300px] overflow-y-auto">
                <h4 className="font-bold text-lg mb-2">
                  {selectedPost.title}
                </h4>
                <div
                  className="prose dark:prose-invert text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
