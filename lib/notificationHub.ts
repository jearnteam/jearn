type NotificationPayload = {
  type: string;
  postId?: string;
  actorId?: string;
  unreadDelta?: number;
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
  clients.get(userId)?.delete(writer);
}

export function emitNotification(userId: string, payload: NotificationPayload) {
  const writers = clients.get(userId);
  if (!writers) return;

  for (const writer of writers) {
    writer.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
  }
}
