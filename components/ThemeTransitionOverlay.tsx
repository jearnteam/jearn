"use client";

import { useEffect, useRef, useState } from "react";
import LoadingOwl from "@/components/LoadingOwl";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function easeInOutCubic(t: number) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function ThemeTransitionOverlay({
  active,
  to,
  onDone,
}: {
  active: boolean;
  to: "light" | "dark";
  onDone: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  const [vars, setVars] = useState<Record<string, string>>({
    "--ov": "0",
    "--color": "0",
    "--owl": "0",
  });

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // ─── TIMING ───
  const FADE_IN = 900;
  const HOLD = 200;
  const FADE_OUT = 400;
  const TOTAL = FADE_IN + HOLD + FADE_OUT;

  // Theme switches here
  const COLOR_PEAK = 0.45;

  useEffect(() => {
    if (!active) return;

    setMounted(true);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = clamp01(elapsed / TOTAL);

      // ─── OVERLAY OPACITY ───
      let ov = 0;
      if (elapsed <= FADE_IN) {
        ov = easeInOutCubic(elapsed / FADE_IN);
      } else if (elapsed <= FADE_IN + HOLD) {
        ov = 1;
      } else if (elapsed <= TOTAL) {
        ov = 1 - easeOutCubic((elapsed - FADE_IN - HOLD) / FADE_OUT);
      } else {
        setMounted(false);
        onDone();
        return;
      }

      // ─── COLOR FULL COVER ───
      let color = 0;
      if (p < COLOR_PEAK) {
        color = easeInOutCubic(p / COLOR_PEAK);
      } else {
        color = easeOutCubic(
          1 - clamp01((p - COLOR_PEAK) / (1 - COLOR_PEAK))
        );
      }

      // ─── OWL VISIBILITY (SMOOTH FADE IN / OUT) ───
      const OWL_IN_START = 0.15;
      const OWL_IN_END = 0.30;
      const OWL_OUT_START = 0.60;
      const OWL_OUT_END = 0.80;

      let owl = 0;

      if (p >= OWL_IN_START && p < OWL_IN_END) {
        // Fade in
        owl = easeOutCubic(
          (p - OWL_IN_START) / (OWL_IN_END - OWL_IN_START)
        );
      } else if (p >= OWL_IN_END && p < OWL_OUT_START) {
        // Fully visible
        owl = 1;
      } else if (p >= OWL_OUT_START && p < OWL_OUT_END) {
        // Fade out
        owl =
          1 -
          easeInOutCubic(
            (p - OWL_OUT_START) / (OWL_OUT_END - OWL_OUT_START)
          );
      } else {
        owl = 0;
      }

      setVars({
        "--ov": String(ov),
        "--color": String(color),
        "--owl": String(owl),
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, onDone]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center"
      style={vars as React.CSSProperties}
    >
      {/* ⚪⚫ FULL COLOR COVER */}
      <div
        className="absolute inset-0"
        style={{
          opacity: "var(--color)",
          backgroundColor: to === "dark" ? "#000000" : "#ffffff",
        }}
      />

      {/* 🦉 CENTER LOADING OWL */}
      <div
        style={{
          opacity: "calc(var(--owl) * var(--ov))",
        }}
      >
        <LoadingOwl theme={to} />
      </div>
    </div>
  );
}
