const clients = new Map<
  string,
  Set<WritableStreamDefaultWriter<Uint8Array>>
>();

const encoder = new TextEncoder();

export function subscribe(
  userId: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(writer);
}

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

// 🔔 THIS is what you call after DB update
export function notify(userId: string) {
  const set = clients.get(userId);
  if (!set) return;

  for (const writer of set) {
    try {
      writer.write(
        encoder.encode(
          "event: notification\ndata: {}\n\n"
        )
      );
    } catch {
      set.delete(writer);
    }
  }
}
