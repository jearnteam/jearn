"use client";

import { useState } from "react";

export default function HomePage() {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  const callAPI = async () => {
    const res = await fetch(`/api/categorize/${encodeURIComponent(content)}`);
    const json = await res.json();
    setCategory(JSON.stringify(json, null, 2));
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">categorize test</h1>
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border px-2 py-1 rounded mr-2"
      />
      <button onClick={callAPI} className="bg-blue-500 text-white px-3 py-1 rounded">
        送信
      </button>
      <pre className="mt-4 whitespace-pre-wrap">{category}</pre>
    </div>
  );
}
