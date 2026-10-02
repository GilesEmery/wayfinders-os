export function reconcileMessageWindow<T extends { id: string; created_at: string }>(previous: readonly T[], incoming: readonly T[], visibleIds: readonly string[]): T[] {
  const visible = new Set(visibleIds);
  const messages = new Map(previous.filter(message => visible.has(message.id)).map(message => [message.id, message]));
  for (const message of incoming) if (visible.has(message.id)) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
