const clients = new Map<string, Set<WritableStreamDefaultWriter<Uint8Array>>>();
const encoder = new TextEncoder();

/* ---------------------------------------------
 * SUBSCRIBE / UNSUBSCRIBE
 * ------------------------------------------- */
export function subscribe(userId: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(writer);
}

export function unsubscribe(userId: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(writer);
  if (set.size === 0) clients.delete(userId);
}

/* ---------------------------------------------
 * NOTIFY WITH DATA
 * ------------------------------------------- */
export function notifyWithData(userId: string, data: any) {
  const set = clients.get(userId);
  if (!set) return;

  const payload = `event: notification\ndata: ${JSON.stringify(data)}\n\n`;

  for (const writer of Array.from(set)) {
    writer.write(encoder.encode(payload)).catch(() => set.delete(writer));
  }

  if (set.size === 0) clients.delete(userId);
}

export function notify(userId: string) {
  // データなしで通知を送る場合は空オブジェクトを送る
  notifyWithData(userId, {});
}
