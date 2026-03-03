import { useState, useEffect, useRef } from "react";
import { Poll } from "@/types/post";

interface PollOption {
  id: string;
  text: string;
}

export function usePollState(
  enabled: boolean,
  initialPoll?: Poll,
  isEdit?: boolean
) {
  const [pollOptions, setPollOptions] = useState<PollOption[]>([]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // 🔥 Prevent re-initializing in edit mode
    if (isEdit && initializedRef.current) return;

    // 🔥 EDIT MODE — preserve real option IDs
    if (isEdit && initialPoll?.options?.length) {
      setPollOptions(
        initialPoll.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
        }))
      );

      setAllowMultiple(initialPoll.allowMultiple ?? false);
      setExpiresAt(initialPoll.expiresAt ?? null);

      initializedRef.current = true; // ✅ lock
      return;
    }

    // 🔥 CREATE MODE
    if (!isEdit) {
      setPollOptions((prev) => {
        if (prev.length >= 2) return prev;

        return [
          { id: crypto.randomUUID(), text: "" },
          { id: crypto.randomUUID(), text: "" },
        ];
      });
    }
  }, [enabled, isEdit]); // remove initialPoll from deps

  const addOption = () => {
    setPollOptions((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  };

  const removeOption = (id: string) => {
    setPollOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, text: string) => {
    setPollOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, text } : o))
    );
  };

  return {
    pollOptions,
    setPollOptions,
    allowMultiple,
    setAllowMultiple,
    expiresAt,
    setExpiresAt,
    addOption,
    removeOption,
    updateOption,
  };
}
