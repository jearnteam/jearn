type NotificationPayload = {
  type: string;
  postId?: string;
  actorId?: string;
  unreadDelta?: number;
  notificationId?: string;
};

const clients = new Map<string, Set<WritableStreamDefaultWriter>>();

export function subscribe(userId: string, writer: WritableStreamDefaultWriter) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(writer);
}

export function unsubscribe(
  userId: string,
  writer: WritableStreamDefaultWriter
) {
  const set = clients.get(userId);
  if (!set) return;

  set.delete(writer);
  if (set.size === 0) {
    clients.delete(userId);
  }
}

export function emitNotification(userId: string, payload: NotificationPayload) {
  const writers = clients.get(userId);

  // 🔍 DEBUG LOG (ADD THIS)
  console.log("🔔 emit →", userId, payload);

  if (!writers) return;

  for (const writer of writers) {
    writer.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

