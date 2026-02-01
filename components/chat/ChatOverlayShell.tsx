"use client";

import { ReactNode, useEffect } from "react";

export interface ChatOverlayShellProps {
  onClose: () => void;
  children: ReactNode;
}

export default function ChatOverlayShell({
  children,
  onClose,
}: ChatOverlayShellProps) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ touchAction: "none" }}
        onClick={onClose}
      />

      {/* PANEL */}
      <div
        className="
          absolute inset-x-0 bottom-0 top-[4.3rem]
          bg-white dark:bg-black
          rounded-t-2xl
          flex flex-col
          overflow-hidden
        "
      >
        {children}
      </div>
    </div>
  );
}
