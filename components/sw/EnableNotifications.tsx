"use client";

import { useState } from "react";

export default function EnableNotifications() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const enable = async () => {
    setLoading(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        setEnabled(true);
        console.log("✅ Notifications enabled");

        // 👉 NEXT STEP (later)
        // subscribe user to push here
      } else {
        console.log("❌ Permission denied");
      }
    } finally {
      setLoading(false);
    }
  };

  if (enabled) return null;

  return (
    <button
      onClick={enable}
      disabled={loading}
      className="px-4 py-2 rounded bg-blue-600 text-white"
    >
      {loading ? "Enabling..." : "🔔 Enable Notifications"}
    </button>
  );
}