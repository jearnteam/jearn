const clients = new Map<string, Set<WritableStreamDefaultWriter<Uint8Array>>>();

const encoder = new TextEncoder();

/* ---------------------------------------------
 * SUBSCRIBE
 * ------------------------------------------- */
export function subscribe(
  userId: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }

  set.add(writer);
}

/* ---------------------------------------------
 * UNSUBSCRIBE
 * ------------------------------------------- */
export function unsubscribe(
  userId: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  const set = clients.get(userId);
  if (!set) return;

  set.delete(writer);

  if (set.size === 0) {
    clients.delete(userId);
  }
}

/* ---------------------------------------------
 * NOTIFICATION DISPATCH
 * ------------------------------------------- */

/**
 * Debounce map:
 * Prevents notification spam when many DB updates happen at once.
 */
const pending = new Set<string>();
const NOTIFY_DEBOUNCE_MS = 300;

/**
 * Call this AFTER DB update
 */
export function notify(userId: string, payload?: any) {
  // 🔕 Already scheduled → skip
  if (pending.has(userId)) return;

  pending.add(userId);

  setTimeout(() => {
    pending.delete(userId);

    const set = clients.get(userId);
    if (!set) return;

    const data = JSON.stringify(payload ?? {});

    for (const writer of Array.from(set)) {
      writer
        .write(encoder.encode(`event: notification\ndata: ${data}\n\n`))
        .catch(() => {
          set.delete(writer);
        });
    }

    if (set.size === 0) {
      clients.delete(userId);
    }
  }, NOTIFY_DEBOUNCE_MS);
}
