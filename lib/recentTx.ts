// lib/recentTx.ts
// Tiny in-memory “seen tx” cache (per-tab) to ignore our own SSE echoes.

const recent = new Set<string>();

export function rememberTx(id: string) {
  if (!id) return;
  recent.add(id);
  // auto-expire after 6s
  setTimeout(() => recent.delete(id), 6000);
}

export function seenTx(id?: string) {
  return !!(id && recent.has(id));
}

// ✅ Alias for consistency with previous examples:
export const isRecentTx = seenTx;
