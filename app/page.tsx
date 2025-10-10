"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PostEditor = dynamic(() => import("@/components/PostEditor"), { ssr: false });

interface Post {
  _id: string;
  title?: string;
  content?: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // TipTap HTML
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    setSubmitting(true);
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setTitle("");
    setContent("");
    setSubmitting(false);
  }

  async function handleEdit(id: string) {
    const newTitle = prompt("New title:");
    const newContent = prompt("New content:");
    if (newTitle === null && newContent === null) return;

    await fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: newTitle, content: newContent }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure?")) return;

    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  useEffect(() => {
    fetchData();
    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new-post") setPosts((prev) => [...prev, data.post]);
      if (data.type === "update-post")
        setPosts((prev) => prev.map((p) => (p._id === data.post._id ? data.post : p)));
      if (data.type === "delete-post")
        setPosts((prev) => prev.filter((p) => p._id !== data.id));
    };

    eventSource.onerror = (err) => console.error("❌ SSE error:", err);
    return () => eventSource.close();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">MongoDB Data (Realtime CRUD)</h1>

      {/* Add Post Form */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Title"
          className="w-full border rounded p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* TipTap editor replaces textarea */}
        <PostEditor onChange={setContent} />

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {submitting ? "Adding..." : "Add Post"}
        </button>
      </form>

      {/* Post List */}
      {posts.length === 0 ? (
        <p>No posts found.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => (
            <li
              key={post._id}
              className="border p-3 rounded-md bg-gray-50 flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold text-black">{post.title || "Untitled"}</h2>
                {post.content && (
                  <div className="text-black" dangerouslySetInnerHTML={{ __html: post.content }} />
                )}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(post._id)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(post._id)}
                  className="bg-red-600 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
