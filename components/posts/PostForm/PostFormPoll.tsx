"use client";

import { motion } from "framer-motion";
import { t } from "i18next";
import { useTranslation } from "react-i18next";

type PollOption = {
  id: string;
  text: string;
};

type Props = {
  pollOptions: PollOption[];
  allowMultiple: boolean;
  setAllowMultiple: (v: boolean) => void;
  expiresAt: string | null;
  setExpiresAt: (v: string | null) => void;
  addOption: () => void;
  removeOption: (id: string) => void;
  updateOption: (id: string, value: string) => void;
  nowLocal: string;
};

export default function PostFormPoll({
  pollOptions,
  allowMultiple,
  setAllowMultiple,
  expiresAt,
  setExpiresAt,
  addOption,
  removeOption,
  updateOption,
  nowLocal,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border p-4 bg-gray-50/50 dark:bg-neutral-900/50">
      <p className="text-sm text-gray-500">
        {t("createPollOpt")}
      </p>

      {/* ---------------- Options ---------------- */}
      {pollOptions.map((opt, idx) => (
        <div key={opt.id} className="flex gap-2">
          <input
            type="text"
            value={opt.text}
            placeholder={`Option ${idx + 1}`}
            maxLength={80}
            onChange={(e) => updateOption(opt.id, e.target.value)}
            className="flex-1 px-3 py-2 rounded-md border bg-transparent"
          />

          {pollOptions.length > 2 && (
            <button
              type="button"
              onClick={() => removeOption(opt.id)}
              className="text-red-500"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {/* ---------------- Add Option ---------------- */}
      {pollOptions.length < 5 && (
        <button
          type="button"
          onClick={addOption}
          className="
            inline-flex items-center gap-1
            px-3 py-1.5 rounded-md
            text-sm font-medium
            border border-blue-500/30
            text-blue-600
            hover:bg-blue-50 dark:hover:bg-blue-500/10
            transition
          "
        >
          <span className="text-lg leading-none">+</span>
          {t("addOption")}
        </button>
      )}

      {/* ---------------- Poll Settings ---------------- */}
      <div className="pt-3 space-y-3 border-t">
        {/* Multiple choice */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="accent-blue-600"
          />
          {t("multipleChoice")}
        </label>

        {/* Expiration */}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-500">
            {t("pollExpiration")}
          </span>
          <input
            type="datetime-local"
            value={expiresAt ?? ""}
            min={nowLocal}
            onChange={(e) =>
              setExpiresAt(e.target.value ? e.target.value : null)
            }
            className="px-3 py-2 rounded-md border bg-transparent"
          />
        </label>

        {expiresAt && (
          <button
            type="button"
            onClick={() => setExpiresAt(null)}
            className="
              inline-flex items-center gap-1
              px-2.5 py-1.5 rounded-md
              text-xs font-medium
              border border-red-500/30
              text-red-600
              hover:bg-red-50 dark:hover:bg-red-500/10
              transition
              w-fit
            "
          >
            ✕ Remove expiration
          </button>
        )}
      </div>
    </div>
  );
}
