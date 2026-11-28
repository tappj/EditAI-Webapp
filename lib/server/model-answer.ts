// Read only final answer text. Reasoning and refusals are never editor commands.
export function modelAnswer(body: any): string | undefined {
  const message = body?.choices?.[0]?.message;
  if (message?.refusal) return undefined;
  if (message?.parsed && typeof message.parsed === 'object' && !Array.isArray(message.parsed)) return JSON.stringify(message.parsed);
  if (typeof message?.content === 'string') return message.content.trim() || undefined;
  if (Array.isArray(message?.content)) {
    const text = message.content.filter((p:any) => ['text','output_text'].includes(p?.type) && typeof p.text === 'string').map((p:any)=>p.text).join('').trim();
    return text || undefined;
  }
  return undefined;
}
