import { useState, useEffect } from "react";

export function usePollState(enabled: boolean) {
  const [pollOptions, setPollOptions] = useState<
    { id: string; text: string }[]
  >([]);

  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // 🔥 Ensure 2 options when poll mode activates
  useEffect(() => {
    if (!enabled) return;

    setPollOptions((prev) => {
      if (prev.length >= 2) return prev;

      return [
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ];
    });
  }, [enabled]);

  const addOption = () => {
    setPollOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: "" },
    ]);
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
    allowMultiple,
    setAllowMultiple,
    expiresAt,
    setExpiresAt,
    addOption,
    removeOption,
    updateOption,
  };
}
