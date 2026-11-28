export function briefChatMessage(text: string) {
  const first = text.trim().split(/(?<=[.!?])\s+/)[0] || "";
  const words = first.split(/\s+/);
  return words.length > 24 ? words.slice(0, 24).join(" ") + "…" : first;
}
