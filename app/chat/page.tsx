"use client";
import { useEffect, useRef, useState } from "react";

interface Message {
  _id: string;
  name: string;
  text: string;
  createdAt: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 📨 Load chat messages
  async function fetchMessages() {
    const res = await fetch("/api/messages");
    const data = await res.json();
    setMessages(data);
    setLoading(false);
  }

  // 📨 Send message
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, text }),
    });

    setText("");
  }

  // ✏️ Edit message
  async function editMessage(id: string, oldText: string) {
    const newText = prompt("Edit your message:", oldText);
    if (!newText || newText === oldText) return;

    await fetch("/api/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text: newText }),
    });
  }

  // 🗑️ Delete message
  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;

    await fetch("/api/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  // 📡 SSE Realtime
  useEffect(() => {
    fetchMessages();
    const eventSource = new EventSource("/api/stream");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new-message") {
        setMessages((prev) => [...prev, data.message]);
      }
      if (data.type === "update-message") {
        setMessages((prev) =>
          prev.map((m) => (m._id === data.message._id ? data.message : m))
        );
      }
      if (data.type === "delete-message") {
        setMessages((prev) => prev.filter((m) => m._id !== data.id));
      }
    };
    eventSource.onerror = (err) => console.error("SSE Error:", err);
    return () => eventSource.close();
  }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save name in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chat-name");
    if (saved) setName(saved);
  }, []);
  useEffect(() => {
    if (name) localStorage.setItem("chat-name", name);
  }, [name]);

  if (loading) return <p className="text-black">Loading chat...</p>;

  return (
    <main className="flex flex-col h-screen max-w-lg mx-auto border rounded text-black bg-white">
      {/* Header */}
      <header className="p-4 border-b flex justify-between items-center bg-gray-100">
        <h1 className="font-bold text-xl">Realtime Chat</h1>
        <input
          type="text"
          placeholder="Your name"
          className="border rounded p-1 px-2 text-black w-32"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </header>

      {/* Messages (start from bottom) */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 text-black flex flex-col">
        {/* This wrapper gets pushed to the bottom */}
        <div className="mt-auto">
          {messages.map((msg) => {
            const isMe = msg.name === name;
            return (
              <div
                key={msg._id}
                className={`mb-3 flex flex-col ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[70%] p-2 rounded-lg ${
                    isMe
                      ? "bg-blue-500 text-white self-end"
                      : "bg-gray-200 text-black self-start"
                  }`}
                >
                  {!isMe && (
                    <div className="text-xs font-semibold mb-1 text-gray-700">
                      {msg.name}
                    </div>
                  )}
                  <div>{msg.text}</div>
                </div>

                {/* timestamp + edit/delete for my messages */}
                <div
                  className={`mt-1 text-xs flex gap-2 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <span className="text-gray-500">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    <>
                      <button
                        onClick={() => editMessage(msg._id, msg.text)}
                        className="text-gray-500 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMessage(msg._id)}
                        className="text-gray-500 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area fixed at bottom */}
      <form
        onSubmit={sendMessage}
        className="p-3 border-t flex bg-white sticky bottom-0 text-black"
      >
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 border rounded p-2 mr-2 text-black"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!name.trim()}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
          disabled={!name.trim() || !text.trim()}
        >
          Send
        </button>
      </form>
    </main>
  );
}
