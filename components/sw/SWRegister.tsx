"use client";
import { useEffect } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });

        console.log("SW registered");

        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission !== "granted") return;

        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

          console.log("VAPID KEY:", vapidKey);

          if (!vapidKey) {
            console.error("❌ VAPID key missing");
            return;
          }

          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        console.log("📬 Push ready", sub);

        await fetch("/api/push/subscribe", {
          method: "POST",
          body: JSON.stringify(sub),
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("SW setup failed", err);
      }
    };

    setup();
  }, []);

  return null;
}
