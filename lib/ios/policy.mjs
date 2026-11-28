// Public source-word safety contracts. AI decisions run on the hosted service.
const cutProperties = {
  firstWord: { type: "string" },
  lastWord: { type: "string" },
  reason: { type: "string" },
  confidence: { type: "number" },
};
const required = [
  "firstWord",
  "lastWord",
  "replacementFirstWord",
  "replacementLastWord",
  "kind",
  "reason",
  "confidence",
];
// Distinct branches enforce replacement evidence only for takes/false starts at generation time.
export const schema = {
  type: "object",
  additionalProperties: false,
  required: ["cuts"],
  properties: {
    cuts: {
      type: "array",
      items: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required,
            properties: {
              ...cutProperties,
              kind: { type: "string", enum: ["retake", "falseStart"] },
              replacementFirstWord: { type: "string" },
              replacementLastWord: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required,
            properties: {
              ...cutProperties,
              kind: {
                type: "string",
                enum: ["flow", "filler", "aside", "background"],
              },
              replacementFirstWord: { type: "null" },
              replacementLastWord: { type: "null" },
            },
          },
        ],
      },
    },
  },
};
export const auditSchema = {
  type: "object",
  additionalProperties: false,
  required: ["approvedCuts"],
  properties: { approvedCuts: { type: "array", items: { type: "integer" } } },
};

// Give the auditor the actual stitched script rather than asking it to mentally
// apply dozens of ranges. IDs and original words remain the authority for edits.
export function retainedTranscript(plan, words) {
  const index = new Map(words.map((word, i) => [word.id, i]));
  const ranges = plan.cuts.map((cut) => [
    index.get(cut.firstWord),
    index.get(cut.lastWord),
  ]);
  return words
    .filter((_, i) => !ranges.some(([a, b]) => a <= i && i <= b))
    .map((w) => w.text)
    .join(" ");
}

export function validateWords(body) {
  if (
    !body ||
    !Array.isArray(body.words) ||
    !body.words.length ||
    body.words.length > 6000
  )
    throw new Error("Invalid transcript size");
  const ids = new Set();
  let previous;
  let size = 0;
  const words = body.words.map((w) => {
    if (
      !w ||
      typeof w.id !== "string" ||
      !/^\d+:\d+$/.test(w.id) ||
      ids.has(w.id) ||
      !Number.isInteger(w.clip) ||
      w.clip < 0 ||
      w.clip > 49 ||
      !Number.isFinite(w.start) ||
      !Number.isFinite(w.end) ||
      w.start < 0 ||
      w.end <= w.start ||
      w.end > 1800 ||
      typeof w.text !== "string" ||
      !w.text.trim() ||
      w.text.length > 1000 ||
      (w.confidence != null &&
        (!Number.isFinite(w.confidence) ||
          w.confidence < 0 ||
          w.confidence > 1)) ||
      (w.speaker != null &&
        (!Number.isInteger(w.speaker) || w.speaker < 0 || w.speaker > 99)) ||
      (previous &&
        (w.clip < previous.clip ||
          (w.clip === previous.clip && w.start < previous.start)))
    )
      throw new Error("Invalid transcript word");
    ids.add(w.id);
    previous = w;
    size += w.text.length;
    return {
      id: w.id,
      clip: w.clip,
      start: w.start,
      end: w.end,
      text: w.text,
      ...(w.confidence != null ? { confidence: w.confidence } : {}),
      ...(w.speaker != null ? { speaker: w.speaker } : {}),
    };
  });
  if (size > 180000) throw new Error("Transcript too large");
  return words;
}

export function validatePlan(plan, words) {
  if (!plan || !Array.isArray(plan.cuts) || plan.cuts.length > 60)
    throw new Error("Invalid edit plan");
  const index = new Map(words.map((w, i) => [w.id, i]));
  const ranges = plan.cuts.map((cut) => {
    const a = index.get(cut.firstWord),
      b = index.get(cut.lastWord);
    const c = index.get(cut.replacementFirstWord),
      d = index.get(cut.replacementLastWord);
    const needsReplacement = ["retake", "falseStart"].includes(cut.kind);
    if (
      ![a, b].every(Number.isInteger) ||
      a > b ||
      b - a >= 160 ||
      words[a].clip !== words[b].clip ||
      words[b].end - words[a].start > 60 ||
      ![
        "falseStart",
        "retake",
        "flow",
        "filler",
        "aside",
        "background",
      ].includes(cut.kind) ||
      !Number.isFinite(cut.confidence) ||
      cut.confidence < 0.9 ||
      cut.confidence > 1 ||
      typeof cut.reason !== "string" ||
      !cut.reason.trim() ||
      cut.reason.length > 240
    )
      throw new Error("Unsafe edit plan");
    if (needsReplacement) {
      if (
        ![c, d].every(Number.isInteger) ||
        c > d ||
        d - c >= 160 ||
        words[c].clip !== words[d].clip ||
        !(d < a || c > b)
      )
        throw new Error("Missing retained replacement");
    } else if (
      cut.replacementFirstWord !== null ||
      cut.replacementLastWord !== null
    )
      throw new Error("Unexpected replacement");
    if (
      cut.kind === "filler" &&
      (b - a > 2 || words[b].end - words[a].start < 0.06)
    )
      throw new Error("Micro filler edit");
    // A retained overlapping speaker/word must not be clipped by someone else's deletion.
    if (
      words.some(
        (w, i) =>
          (i < a || i > b) &&
          w.clip === words[a].clip &&
          w.start < words[b].end &&
          w.end > words[a].start,
      )
    )
      throw new Error("Overlapping retained speech");
    return { a, b, c, d };
  });
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (
      ranges.some(
        (other, j) => i !== j && other.a <= range.b && other.b >= range.a,
      )
    )
      throw new Error("Overlapping removals");
    if (
      range.c !== undefined &&
      ranges.some(
        (other, j) =>
          other.a <= range.d &&
          other.b >= range.c &&
          !(
            plan.cuts[j].kind === "filler" &&
            other.a > range.c &&
            other.b < range.d
          ),
      )
    )
      throw new Error("Replacement would be removed");
  }
  if (
    words.length - ranges.reduce((n, r) => n + r.b - r.a + 1, 0) <
    Math.min(words.length, 3)
  )
    throw new Error("Message would be empty");
  return {
    cuts: plan.cuts.map(
      ({
        firstWord,
        lastWord,
        replacementFirstWord,
        replacementLastWord,
        kind,
        reason,
        confidence,
      }) => ({
        firstWord,
        lastWord,
        replacementFirstWord,
        replacementLastWord,
        kind,
        reason,
        confidence,
      }),
    ),
  };
}
// Salvage independent valid edits without widening a failed proposal. The audit still
// evaluates the combined retained story; a malformed entire reply remains a failure.
export function preparePlan(plan, words) {
  if (!plan || !Array.isArray(plan.cuts) || plan.cuts.length > 60)
    throw new Error("Invalid edit plan");
  const valid = plan.cuts
    .map((cut) => ({
      ...cut,
      reason:
        typeof cut?.reason === "string"
          ? cut.reason.slice(0, 240)
          : cut?.reason,
    }))
    .filter((cut) => {
      try {
        validatePlan({ cuts: [cut] }, words);
        return true;
      } catch {
        return false;
      }
    });
  const index = new Map(words.map((w, i) => [w.id, i]));
  const range = (cut) => [index.get(cut.firstWord), index.get(cut.lastWord)];
  // Resolve a model's intermediate take to its final surviving take. Only follow
  // explicit replacement links; never invent new evidence or expand a removal.
  function resolve(cut, visited = new Set()) {
    if (cut.replacementFirstWord === null) return cut;
    if (visited.has(cut)) return null;
    visited.add(cut);
    const c = index.get(cut.replacementFirstWord),
      d = index.get(cut.replacementLastWord);
    const blockers = valid.filter((other) => {
      const [a, b] = range(other);
      return a <= d && b >= c && !(other.kind === "filler" && a > c && b < d);
    });
    if (!blockers.length) return cut;
    // Ambiguous or partially erased evidence remains rejected, including cyclic takes.
    if (blockers.length !== 1) return null;
    const blocker = blockers[0],
      [a, b] = range(blocker);
    if (a > c || b < d || !["retake", "falseStart"].includes(blocker.kind))
      return null;
    const final = resolve(blocker, visited);
    return final
      ? {
          ...cut,
          replacementFirstWord: final.replacementFirstWord,
          replacementLastWord: final.replacementLastWord,
        }
      : null;
  }
  const resolved = valid.map((cut) => resolve(cut)).filter(Boolean);
  // Identical overlapping take proposals collapse to their exact union. Conflicting
  // targets are restored. Never bridge an unproposed word between two removals.
  const same = (a, b) =>
    a.kind === b.kind &&
    a.replacementFirstWord === b.replacementFirstWord &&
    a.replacementLastWord === b.replacementLastWord;
  const unambiguous = resolved
    .filter(
      (cut, i) =>
        !resolved.some((other, j) => {
          const [a, b] = range(cut),
            [x, y] = range(other);
          return i !== j && x <= b && y >= a && !same(cut, other);
        }),
    )
    .sort((a, b) => range(a)[0] - range(b)[0]);
  const merged = [];
  for (const cut of unambiguous) {
    const last = merged.at(-1);
    if (last && range(cut)[0] <= range(last)[1] && same(cut, last)) {
      const end = Math.max(range(last)[1], range(cut)[1]);
      const union = {
        ...last,
        lastWord: words[end].id,
        confidence: Math.min(last.confidence, cut.confidence),
      };
      try {
        validatePlan({ cuts: [union] }, words);
        merged[merged.length - 1] = union;
      } catch {
        merged.pop();
      }
    } else merged.push(cut);
  }
  if (plan.cuts.length && !merged.length)
    throw new Error("No independently safe edits");
  return validatePlan({ cuts: merged }, words);
}
export function applyAudit(audit, plan, words) {
  if (
    !audit ||
    !Array.isArray(audit.approvedCuts) ||
    audit.approvedCuts.length > plan.cuts.length ||
    new Set(audit.approvedCuts).size !== audit.approvedCuts.length ||
    audit.approvedCuts.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= plan.cuts.length,
    )
  )
    throw new Error("Invalid safety audit");
  return validatePlan(
    { cuts: plan.cuts.filter((_, i) => audit.approvedCuts.includes(i)) },
    words,
  );
}
export function extractPlan(response) {
  if (
    response.stop_reason !== "end_turn" ||
    !Array.isArray(response.content) ||
    response.content.some(
      (item) => !["text", "thinking", "redacted_thinking"].includes(item.type),
    )
  )
    throw new Error("Incomplete model response");
  return JSON.parse(
    response.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join(""),
  );
}
