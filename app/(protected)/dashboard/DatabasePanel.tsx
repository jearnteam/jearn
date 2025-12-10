"use client";

import { useEffect, useState, useMemo } from "react";
import { Edit3, Trash2, Save, XCircle, Search } from "lucide-react";

export default function DatabasePanel() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState<any | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [searchPostId, setSearchPostId] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  /* ---------- Fetch Posts (admin route) ---------- */
  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/all-posts");
        const data = await res.json();
        if (Array.isArray(data)) setPosts(data);
        else console.error("Unexpected data:", data);
      } catch (err) {
        console.error("❌ Failed to fetch posts:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  /* ---------- Delete ---------- */
  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;

    try {
      const res = await fetch(`/api/admin/delete-post/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (err) {
      console.error("🔥 Delete failed:", err);
    }
  }

  /* ---------- Filter logic ---------- */
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const idMatch =
        !searchPostId ||
        p._id?.toLowerCase().includes(searchPostId.toLowerCase());

      const userMatch =
        !searchUser ||
        p.authorName?.toLowerCase().includes(searchUser.toLowerCase());

      const userIdMatch =
        !searchUserId ||
        p.authorId?.toLowerCase().includes(searchUserId.toLowerCase());

      const catMatch =
        !searchCategory ||
        (Array.isArray(p.categories) &&
          p.categories.some((c: string) =>
            c.toLowerCase().includes(searchCategory.toLowerCase())
          ));

      const created = new Date(p.createdAt);
      const fromMatch = !dateFrom || created >= new Date(dateFrom);
      const toMatch = !dateTo || created <= new Date(dateTo);

      return (
        idMatch && userMatch && userIdMatch && catMatch && fromMatch && toMatch
      );
    });
  }, [
    posts,
    searchPostId,
    searchUser,
    searchUserId,
    searchCategory,
    dateFrom,
    dateTo,
  ]);

  /* Reset pagination on filter change */
  useEffect(() => setCurrentPage(1), [
    searchPostId,
    searchUser,
    searchUserId,
    searchCategory,
    dateFrom,
    dateTo,
  ]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  /* ---------- JSON Editor ---------- */
  const openEditor = (post: any) => {
    setEditPost(post);
    setJsonText(JSON.stringify(post, null, 2));
    setErrorMsg("");
  };

  /* ---------- Save changes (admin update API) ---------- */
  async function handleSave() {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed._id) throw new Error("Missing _id field.");

      const res = await fetch(`/api/admin/update-post/${parsed._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: jsonText,
      });

      const data = await res.json();
      console.log("SAVE RESPONSE:", data);

      if (!data.ok) throw new Error("Update failed.");

      alert("✅ Saved!");

      setPosts((prev) =>
        prev.map((p) => (p._id === parsed._id ? { ...p, ...parsed } : p))
      );

      setEditPost(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Database Management</h1>

      {/* ---------- Filter Bar ---------- */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex items-center gap-2">
          <Search size={16} />
          <input
            type="text"
            placeholder="Post ID"
            value={searchPostId}
            onChange={(e) => setSearchPostId(e.target.value)}
            className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-gray-700"
          />
        </div>

        <input
          type="text"
          placeholder="Username"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-gray-700"
        />

        <input
          type="text"
          placeholder="User ID"
          value={searchUserId}
          onChange={(e) => setSearchUserId(e.target.value)}
          className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-gray-700"
        />

        <input
          type="text"
          placeholder="Category"
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
          className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-gray-700"
        />

        <div className="flex items-center gap-2">
          <label className="text-sm">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-gray-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-gray-700"
          />
        </div>
      </div>

      {/* ---------- Posts Table ---------- */}
      {loading ? (
        <p>Loading posts...</p>
      ) : (
        <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-neutral-800 text-left">
              <tr>
                <th className="px-3 py-2">Post ID</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((p) => (
                <tr
                  key={p._id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <td className="px-3 py-2 text-xs text-gray-500">{p._id}</td>
                  <td className="px-3 py-2">{p.title ?? "(no title)"}</td>
                  <td className="px-3 py-2">
                    {Array.isArray(p.categories)
                      ? p.categories.join(", ")
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => openEditor(p)}
                      className="text-blue-500 hover:text-blue-700 mr-3"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                  >
                    No matching results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Pagination ---------- */}
      <div className="flex justify-center items-center gap-4 mt-4 text-sm">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className={`px-3 py-1 rounded ${
            currentPage === 1
              ? "bg-gray-300 dark:bg-neutral-800 opacity-50 cursor-not-allowed"
              : "bg-gray-300 dark:bg-neutral-800 hover:bg-gray-400 dark:hover:bg-neutral-700"
          }`}
        >
          ← Prev
        </button>

        <span className="text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          className={`px-3 py-1 rounded ${
            currentPage === totalPages || totalPages === 0
              ? "bg-gray-300 dark:bg-neutral-800 opacity-50 cursor-not-allowed"
              : "bg-gray-300 dark:bg-neutral-800 hover:bg-gray-400 dark:hover:bg-neutral-700"
          }`}
        >
          Next →
        </button>
      </div>

      {/* ---------- JSON Modal Editor ---------- */}
      {editPost && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999999] p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-lg shadow-xl p-4 relative">
            <h2 className="text-lg font-semibold mb-2">
              Edit Document ({editPost._id})
            </h2>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-96 border dark:border-gray-700 rounded p-2 font-mono text-sm bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100"
            />

            {errorMsg && (
              <p className="text-red-500 text-sm mt-2">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditPost(null)}
                className="flex items-center gap-2 px-3 py-1 rounded bg-gray-300 dark:bg-neutral-800 hover:bg-gray-400 dark:hover:bg-neutral-700"
              >
                <XCircle size={16} /> Cancel
              </button>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
              >
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
