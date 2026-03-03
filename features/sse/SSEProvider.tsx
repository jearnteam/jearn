"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type SSEMessage = any;

type SSEContextType = {
  lastMessage: SSEMessage | null;
};

const SSEContext = createContext<SSEContextType>({
  lastMessage: null,
});

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (eventSourceRef.current) return;

    const es = new EventSource("/api/stream", {
      withCredentials: true,
    });

    eventSourceRef.current = es;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    // 🔥 Default message (no event:)
    es.onmessage = handleMessage;

    // 🔥 Named events (event: something)
    const eventTypes = [
      "new-post",
      "update-post",
      "delete-post",
      "upvote",
      "update-comment-count",
      "poll-vote",
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, handleMessage);
    });

    es.onerror = () => {
      console.warn("SSE disconnected");
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  return (
    <SSEContext.Provider value={{ lastMessage }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  return useContext(SSEContext);
}
