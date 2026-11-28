// Keep the model request small even for long recordings: retain the opening hook
// and evenly sample the rest of the transcript across the video's timeline.
export const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "hook", "highlights"],
  properties: {
    summary: {
      type: "string",
      description: "Main point, under 350 characters.",
    },
    hook: {
      type: "string",
      description: "Assessment of the opening hook, under 250 characters.",
    },
    highlights: {
      type: "array",
      items: {
        type: "string",
        description:
          "One timestamped highlight as plain text, under 150 characters. Return 1 to 3 highlights.",
      },
    },
  },
};
export function compactSummaryInput(words, maxWords = 900) {
  if (!Array.isArray(words) || !words.length) throw new Error("Transcript is empty");
  const segments = [];
  const append = chunk => {
    if (chunk.length) segments.push({time: Math.floor(chunk[0].start), text: chunk.map(word => word.text).join(" ")});
  };
  if (words.length <= maxWords) {
    for (let index = 0; index < words.length; index += 45) append(words.slice(index, index + 45));
  } else {
    for (let index = 0; index < 180; index += 30) append(words.slice(index, index + 30));
    const sampleCount = Math.floor((maxWords - 180) / 20);
    for (let index = 0; index < sampleCount; index++) {
      const start = 180 + Math.floor(index * (words.length - 200) / Math.max(1, sampleCount - 1));
      append(words.slice(start, start + 20));
    }
  }
  return segments;
}

export function validateSummary(value) {
  const bounded = (text, max) => typeof text === "string" && text.trim().length > 0 && text.length <= max;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "highlights,hook,summary" ||
      !bounded(value.summary, 500) || !bounded(value.hook, 350) ||
      !Array.isArray(value.highlights) || value.highlights.length < 1 || value.highlights.length > 3 ||
      value.highlights.some(item => !bounded(item, 220))) throw new Error("Invalid video summary");
  return {summary: value.summary.trim(), hook: value.hook.trim(),
    highlights: value.highlights.map(item => item.trim())};
}
