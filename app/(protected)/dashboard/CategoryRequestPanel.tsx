"use client";

import { useEffect, useState } from "react";
import { CategoryRequest } from "@/types/category";
import dayjs from "@/lib/dayjs";
import { Check, X } from "lucide-react";

export default function CategoryRequestsPanel() {
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // 承認用の一時State
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", jname: "", myname: "" });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/category-request");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const startApprove = (req: CategoryRequest) => {
    setApprovingId(req._id);
    // 初期値としてリクエストされた名前を全フィールドに入れておく
    setFormData({
      name: req.requestedName, // 英語名として提案
      jname: req.requestedName, // 日本語名として提案
      myname: req.requestedName, // ミャンマー語名として提案
    });
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    try {
      const res = await fetch("/api/admin/category-request/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: approvingId, ...formData }),
      });
      if (res.ok) {
        setApprovingId(null);
        fetchRequests(); // リロード
      } else {
        alert("Failed to approve");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    try {
      const res = await fetch("/api/admin/category-request/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id }),
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return <div className="p-4 text-gray-500">Loading requests...</div>;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 font-bold text-lg">
        Category Requests
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pending requests.
          </div>
        ) : (
          requests.map((req) => (
            <div key={req._id} className="p-4 flex flex-col gap-3">
              {/* Request Info */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {req.requestedName}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    by {req.userName} •{" "}
                    {dayjs(req.createdAt).format("YYYY/MM/DD HH:mm")}
                  </div>
                  {req.reason && (
                    <div className="mt-2 text-sm bg-gray-50 dark:bg-neutral-800 p-2 rounded text-gray-700 dark:text-gray-300">
                      Reason: {req.reason}
                    </div>
                  )}
                </div>

                {/* Actions (if not approving) */}
                {approvingId !== req._id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startApprove(req)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                      title="Approve & Register"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => handleReject(req._id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      title="Reject"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Approval Form (Inline) */}
              {approvingId === req._id && (
                <div className="mt-2 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-blue-200 dark:border-blue-900/30">
                  <h4 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
                    Register New Category
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        English Name (Required)
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-sm"
                        placeholder="English"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Japanese Name
                      </label>
                      <input
                        type="text"
                        value={formData.jname}
                        onChange={(e) =>
                          setFormData({ ...formData, jname: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-sm"
                        placeholder="日本語"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Burmese Name
                      </label>
                      <input
                        type="text"
                        value={formData.myname}
                        onChange={(e) =>
                          setFormData({ ...formData, myname: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-sm"
                        placeholder="Burmese"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setApprovingId(null)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded dark:text-gray-400 dark:hover:bg-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={!formData.name}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Confirm Registration
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
