"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import { ChevronDown, Check } from "lucide-react";

const REASONS = [
  "Spam",
  "Harassment",
  "Hate Speech",
  "NSFW",
  "Misinformation",
  "Other",
];

export default function ReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(".relative")) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  async function handleSubmit() {
    setError("");

    let finalReason = reason;

    if (!reason) {
      setError("Please select a reason.");
      return;
    }

    if (reason === "Other") {
      if (!customReason.trim()) {
        setError("Please describe the issue.");
        return;
      }
      finalReason = customReason.trim();
    }

    setLoading(true);
    await onSubmit(finalReason);
    setLoading(false);

    setReason("");
    setCustomReason("");
  }

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Report Post</h2>

              {/* Custom Dropdown */}
              <div className="relative mb-4">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="
      w-full flex items-center justify-between
      p-3 rounded-lg
      border border-gray-300 dark:border-neutral-700
      bg-transparent
      hover:border-gray-400 dark:hover:border-neutral-600
      transition
    "
                >
                  <span className={reason ? "" : "text-gray-400"}>
                    {reason || "Select reason"}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="
          absolute mt-2 w-full z-20
          rounded-xl overflow-hidden
          bg-white dark:bg-neutral-800
          border border-gray-200 dark:border-neutral-700
          shadow-lg
        "
                    >
                      {REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setReason(r);
                            setDropdownOpen(false);
                            setError("");
                          }}
                          className="
              w-full flex items-center justify-between
              px-4 py-2
              hover:bg-gray-100 dark:hover:bg-neutral-700
              transition
            "
                        >
                          <span>{r}</span>
                          {reason === r && (
                            <Check size={16} className="text-red-500" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Show textarea only when Other */}
              <AnimatePresence>
                {reason === "Other" && (
                  <motion.textarea
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 100 }}
                    exit={{ opacity: 0, height: 0 }}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please describe the issue..."
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent mb-3 resize-none"
                  />
                )}
              </AnimatePresence>

              {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    loading ||
                    !reason ||
                    (reason === "Other" && !customReason.trim())
                  }
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
