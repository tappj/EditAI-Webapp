export const chatOperationKinds = [
  "trim",
  "removeRange",
  "delete",
  "split",
  "move",
  "duplicate",
  "speed",
  "volume",
  "canvas",
  "framing",
  "filter",
  "adjustment",
  "opacity",
  "resetAppearance",
  "crop",
  "resetCrop",
  "addText",
  "updateText",
  "removeText",
  "retimeText",
  "captionSize",
  "captionPosition",
  "captionStyle",
  "addClip",
  "addOverlay",
  "addAudio",
  "makeOverlay",
  "overlayLayout",
  "audioSettings",
  "speedRange",
  "zoomRange",
];
export const legacyChatOperationKinds = chatOperationKinds.slice(
  0,
  chatOperationKinds.indexOf("addClip"),
);
const nullable = (type) => ({ type: [type, "null"] });
const choice = (values) => ({
  type: ["string", "null"],
  enum: [...values, null],
});
const object = (properties) => ({
  type: ["object", "null"],
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const color = object({
  red: { type: "number" },
  green: { type: "number" },
  blue: { type: "number" },
});
const animation = choice([
  "none",
  "fade",
  "pop",
  "zoom",
  "slide",
  "typewriter",
]);
const styleProperties = {
  font: choice([
    "tiktokClassic",
    "arial",
    "outlinedArial",
    "anton",
    "archivoBlack",
    "barlowCondensed",
    "lobster",
    "montserrat",
    "poppins",
    "oswald",
    "inter",
    "nunito",
    "playfairDisplay",
    "courierPrime",
    "caveat",
    "permanentMarker",
    "bebasNeue",
    "leagueSpartan",
    "kanit",
    "fjallaOne",
    "staatliches",
    "delaGothicOne",
    "figtree",
    "dmSans",
    "outfit",
    "plusJakartaSans",
    "spaceGrotesk",
    "sora",
    "jost",
    "quicksand",
    "lilitaOne",
    "luckiestGuy",
    "bangers",
    "fredoka",
    "titanOne",
    "chewy",
    "bungee",
    "righteous",
    "shrikhand",
    "dmSerifDisplay",
    "abrilFatface",
    "instrumentSerif",
    "cinzel",
    "yesevaOne",
    "alfaSlabOne",
    "ultra",
    "pacifico",
    "dancingScript",
    "shadowsIntoLight",
    "greatVibes",
    "satisfy",
    "gloriaHallelujah",
    "rockSalt",
    "specialElite",
    "pressStart2P",
    "vt323",
    "silkscreen",
    "monoton",
    "blackOpsOne",
    "rye",
    "creepster",
  ]),
  fontWeight: nullable("integer"),
  size: nullable("number"),
  verticalPosition: nullable("number"),
  horizontalPosition: nullable("number"),
  textColor: color,
  background: choice(["none", "black", "white"]),
  backgroundOpacity: nullable("number"),
  backgroundPadding: nullable("number"),
  backgroundColor: color,
  backgroundRadius: nullable("number"),
  outline: choice(["none", "black", "white", "automatic"]),
  outlineWidth: nullable("number"),
  outlineColor: color,
  textBoxWidth: nullable("number"),
  alignment: choice(["left", "center", "right"]),
  letterSpacing: nullable("number"),
  lineSpacing: nullable("number"),
  textOpacity: nullable("number"),
  shadowOpacity: nullable("number"),
  shadowColor: color,
  shadowBlur: nullable("number"),
  shadowOffset: nullable("number"),
  animationIn: animation,
  animationOut: animation,
  animationDuration: nullable("number"),
};
const cropProperties = {
  x: nullable("number"),
  y: nullable("number"),
  width: nullable("number"),
  height: nullable("number"),
  quarterTurns: nullable("integer"),
  flipHorizontal: nullable("boolean"),
  flipVertical: nullable("boolean"),
};
const mediaProperties = {
  source: nullable("integer"),
  time: nullable("number"),
  lane: nullable("integer"),
  centerX: nullable("number"),
  centerY: nullable("number"),
  width: nullable("number"),
  isMuted: nullable("boolean"),
  fadeIn: nullable("number"),
  fadeOut: nullable("number"),
  name: nullable("string"),
};
export const chatSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "message",
    "generateCaptions",
    "captionFormat",
    "operations",
    "captionPhrases",
    "referenceLayouts",
  ],
  properties: {
    referenceLayouts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "scope",
          "lines",
          "left",
          "top",
          "right",
          "bottom",
          "strokeWidth",
        ],
        properties: {
          scope: { type: "string", enum: ["text", "captions"] },
          lines: { type: "array", items: { type: "string" } },
          left: { type: "number" },
          top: { type: "number" },
          right: { type: "number" },
          bottom: { type: "number" },
          strokeWidth: { type: "number" },
        },
      },
    },
    captionPhrases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["firstWord", "lastWord", "text"],
        properties: {
          firstWord: { type: "string" },
          lastWord: { type: "string" },
          text: { type: "string" },
        },
      },
    },
    message: { type: "string" },
    generateCaptions: { type: "boolean" },
    captionFormat: choice(["standard", "boxed", "single"]),
    operations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "kind",
          "target",
          "start",
          "end",
          "value",
          "text",
          "scope",
          "style",
          "crop",
          "media",
        ],
        properties: {
          kind: { type: "string", enum: chatOperationKinds },
          target: nullable("string"),
          start: nullable("number"),
          end: nullable("number"),
          value: nullable("number"),
          text: nullable("string"),
          scope: choice(["all", "captions", "text"]),
          style: object(styleProperties),
          crop: object(cropProperties),
          media: object(mediaProperties),
        },
      },
    },
  },
};

export function validateChatRequest(input) {
  if (
    input?.mode !== "chat" ||
    typeof input.prompt !== "string" ||
    !input.prompt.trim() ||
    input.prompt.length > 2000 ||
    !Array.isArray(input.messages) ||
    input.messages.length > 12 ||
    input.messages.some(
      (m) =>
        !["user", "assistant"].includes(m.role) ||
        typeof m.text !== "string" ||
        m.text.length > 2000,
    ) ||
    !input.document ||
    !Array.isArray(input.document.segments) ||
    !input.document.segments.length ||
    input.document.segments.length > 1000 ||
    !Array.isArray(input.sourceDurations) ||
    !input.sourceDurations.length ||
    input.sourceDurations.length > 1000 ||
    input.sourceDurations.some((n) => !Number.isFinite(n) || n <= 0)
  ) {
    throw new Error("Invalid editor request");
  }
  const ids = new Set();
  if (
    input.supportedOperations !== undefined &&
    (!Array.isArray(input.supportedOperations) ||
      input.supportedOperations.length > chatOperationKinds.length ||
      input.supportedOperations.some(
        (kind) => !chatOperationKinds.includes(kind),
      ))
  )
    throw new Error("Invalid tool capabilities");
  if (input.reference !== undefined && input.reference !== null) {
    const reference = input.reference;
    const bounded = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;

    if (
      !reference ||
      !["image", "video"].includes(reference.kind) ||
      typeof reference.name !== "string" ||
      !reference.name.trim() ||
      reference.name.length > 255 ||
      !Array.isArray(reference.frames) ||
      reference.frames.length < 1 ||
      reference.frames.length > 18 ||
      (reference.kind === "image" && reference.frames.length !== 1) ||
      (reference.kind === "video" && reference.frames.length < 2)
    )
      throw new Error("Invalid visual reference");
    let total = 0;
    if (
      reference.textObservations !== undefined &&
      (!Array.isArray(reference.textObservations) ||
        reference.textObservations.length > 32 ||
        reference.textObservations.some(
          (o) =>
            !o ||
            !Array.isArray(o.lines) ||
            o.lines.length < 1 ||
            o.lines.length > 4 ||
            o.lines.some((s) => typeof s !== "string" || s.length > 120) ||
            ![o.left, o.top, o.right, o.bottom, o.confidence].every(
              Number.isFinite,
            ) ||
            o.left < 0 ||
            o.top < 0 ||
            o.right > 1 ||
            o.bottom > 1 ||
            o.right <= o.left ||
            o.bottom <= o.top ||
            o.confidence < 0 ||
            o.confidence > 100 ||
            (o.strokeWidth !== undefined &&
              !bounded(o.strokeWidth, 0.0005, 0.02)) ||
            !(
              o.time === null || bounded(o.time, 0, reference.duration ?? 1800)
            ),
        ))
    )
      throw new Error("Invalid reference text measurements");
    for (const frame of reference.frames) {
      if (
        !frame ||
        typeof frame.base64JPEG !== "string" ||
        frame.base64JPEG.length > 500_000 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          frame.base64JPEG,
        ) ||
        (frame.timeSeconds !== null &&
          frame.timeSeconds !== undefined &&
          (!Number.isFinite(frame.timeSeconds) ||
            frame.timeSeconds < 0 ||
            frame.timeSeconds > 1800))
      ) {
        throw new Error("Invalid visual reference frame");
      }
      total += frame.base64JPEG.length;
    }
    if (total > 1_500_000) throw new Error("Visual reference is too large");
    if (
      reference.width !== undefined &&
      (!bounded(reference.width, 1, 16384) ||
        !bounded(reference.height, 1, 16384))
    )
      throw new Error("Invalid reference dimensions");
    if (reference.duration != null && !bounded(reference.duration, 0.001, 1800))
      throw new Error("Invalid reference duration");
    if (
      reference.safePlacement !== undefined &&
      typeof reference.safePlacement !== "boolean"
    )
      throw new Error("Invalid reference placement");
    for (const frame of reference.frames) {
      if (
        frame.repeatTransitions !== undefined &&
        (!Number.isInteger(frame.repeatTransitions) ||
          frame.repeatTransitions < 0 ||
          frame.repeatTransitions > 5)
      )
        throw new Error("Invalid frame repetition");
      if (
        frame.role !== undefined &&
        !["detail", "motion", "fontGuide"].includes(frame.role)
      )
        throw new Error("Invalid frame role");
      if (
        frame.times !== undefined &&
        (!Array.isArray(frame.times) ||
          frame.times.length !== 6 ||
          frame.times.some(
            (n, i) =>
              !bounded(n, 0, reference.duration ?? 1800) ||
              (i && n < frame.times[i - 1]),
          ))
      )
        throw new Error("Invalid motion strip");
    }
    if (reference.temporal) {
      const t = reference.temporal;
      if (
        !bounded(t.sampleInterval, 0.001, 1800) ||
        (t.medianShotSeconds !== null &&
          !bounded(t.medianShotSeconds, 0, 1800)) ||
        !Array.isArray(t.sceneChangeCandidates) ||
        t.sceneChangeCandidates.length > 160 ||
        t.sceneChangeCandidates.some(
          (n, i) =>
            !bounded(n, 0, reference.duration ?? 1800) ||
            (i && n < t.sceneChangeCandidates[i - 1]),
        ) ||
        !Array.isArray(t.motionWindows) ||
        t.motionWindows.length > 100 ||
        t.motionWindows.some(
          (w) =>
            !bounded(w.start, 0, 1800) ||
            !bounded(w.end, w.start, 1800) ||
            !bounded(w.change, 0, 1.00001),
        )
      )
        throw new Error("Invalid reference timing");
    }
    if (reference.audio) {
      const a = reference.audio;
      if (
        !["measured", "silent", "unavailable"].includes(a.status) ||
        (a.quietFraction !== null && !bounded(a.quietFraction, 0, 1)) ||
        !Array.isArray(a.quietWindows) ||
        a.quietWindows.length > 200 ||
        a.quietWindows.some(
          (w) => !bounded(w.start, 0, 1800) || !bounded(w.end, w.start, 1800),
        )
      )
        throw new Error("Invalid reference audio");
    }
  }
  for (const segment of input.document.segments) {
    if (
      !segment ||
      typeof segment.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(segment.id) ||
      ids.has(segment.id) ||
      !Number.isInteger(segment.source) ||
      segment.source < 0 ||
      segment.source >= input.sourceDurations.length ||
      !Number.isFinite(segment.start) ||
      !Number.isFinite(segment.end) ||
      segment.start < 0 ||
      segment.end <= segment.start ||
      segment.end > input.sourceDurations[segment.source] + 0.01 ||
      !Number.isFinite(segment.speed) ||
      segment.speed < 0.25 ||
      segment.speed > 4 ||
      !Number.isFinite(segment.volume) ||
      segment.volume < 0 ||
      segment.volume > 1
    )
      throw new Error("Invalid timeline");
    ids.add(segment.id);
  }
  if (
    input.sources !== undefined &&
    (!Array.isArray(input.sources) ||
      input.sources.length !== input.sourceDurations.length ||
      input.sources.some(
        (source) =>
          !source ||
          typeof source.name !== "string" ||
          source.name.length > 255 ||
          typeof source.isAudioOnly !== "boolean",
      ))
  )
    throw new Error("Invalid source library");
  for (const key of ["overlays", "audioClips"]) {
    const clips = input.document[key] ?? [];
    if (!Array.isArray(clips) || clips.length > 1000)
      throw new Error("Invalid media tracks");
    for (const clip of clips) {
      const s = clip?.segment;
      if (
        !s ||
        typeof s.id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(s.id) ||
        ids.has(s.id) ||
        !Number.isInteger(s.source) ||
        s.source < 0 ||
        s.source >= input.sourceDurations.length ||
        !Number.isFinite(s.start) ||
        !Number.isFinite(s.end) ||
        s.start < 0 ||
        s.end <= s.start ||
        // Still-image overlays can remain visible beyond their nominal source
        // duration. Match the editor's existing 50ms media boundary tolerance.
        (!(
          key === "overlays" &&
          input.document.sources?.[s.source]?.kind === "image"
        ) &&
          s.end > input.sourceDurations[s.source] + 0.05) ||
        !Number.isFinite(s.speed) ||
        s.speed < 0.25 ||
        s.speed > 4 ||
        !Number.isFinite(s.volume) ||
        s.volume < 0 ||
        s.volume > 1 ||
        !Number.isFinite(clip.start) ||
        clip.start < 0 ||
        (key === "audioClips" &&
          (!Number.isInteger(clip.lane) || clip.lane < 0 || clip.lane > 6))
      ) {
        throw new Error("Invalid media track");
      }
      ids.add(s.id);
    }
  }
  return input;
}

function conforms(value, schema, path = "response") {
  const type =
    value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (
    !types.includes(type) &&
    !(type === "number" && types.includes("integer") && Number.isInteger(value))
  )
    return `${path}: incorrect field type`;
  if (type === "number" && !Number.isFinite(value))
    return `${path}: nonfinite number`;
  if (schema.enum && !schema.enum.includes(value))
    return `${path}: unsupported value`;
  if (
    type === "number" &&
    schema.minimum !== undefined &&
    value < schema.minimum
  )
    return `${path}: below minimum ${schema.minimum}`;
  if (
    type === "number" &&
    schema.maximum !== undefined &&
    value > schema.maximum
  )
    return `${path}: above maximum ${schema.maximum}`;
  if (
    type === "string" &&
    schema.minLength !== undefined &&
    value.length < schema.minLength
  )
    return `${path}: shorter than ${schema.minLength} characters`;
  if (
    type === "string" &&
    schema.maxLength !== undefined &&
    value.length > schema.maxLength
  )
    return `${path}: longer than ${schema.maxLength} characters`;
  if (
    type === "array" &&
    schema.minItems !== undefined &&
    value.length < schema.minItems
  )
    return `${path}: fewer than ${schema.minItems} items`;
  if (
    type === "array" &&
    schema.maxItems !== undefined &&
    value.length > schema.maxItems
  )
    return `${path}: more than ${schema.maxItems} items`;
  if (type === "object") {
    if (
      Object.keys(value).some((key) => !Object.hasOwn(schema.properties, key))
    )
      return `${path}: unexpected field`;
    for (const key of schema.required)
      if (!Object.hasOwn(value, key)) return `${path}.${key}: missing field`;
    for (const [key, item] of Object.entries(value)) {
      const issue = conforms(item, schema.properties[key], `${path}.${key}`);
      if (issue) return issue;
    }
  }
  if (type === "array")
    for (let index = 0; index < value.length; index++) {
      const issue = conforms(value[index], schema.items, `${path}[${index}]`);
      if (issue) return issue;
    }
  return null;
}

// Diagnostics contain schema paths and fixed reasons, never prompt/media/key data.
export class ChatReplyError extends Error {
  constructor(issue) {
    super(issue);
    this.name = "ChatReplyError";
  }
}

/** @returns {any} */
export function chatSchemaFor(context) {
  const schema = structuredClone(chatSchema);
  const supported = context.supportedOperations ?? legacyChatOperationKinds;
  if (supported.length)
    schema.properties.operations.items.properties.kind.enum = [...supported];
  else schema.properties.operations.maxItems = 0;
  Object.assign(schema.properties.message, { minLength: 1, maxLength: 2000 });
  const layouts = schema.properties.referenceLayouts;
  layouts.maxItems = 2;
  const layout = layouts.items.properties;
  Object.assign(layout.lines, { minItems: 1, maxItems: 5 });
  Object.assign(layout.lines.items, { minLength: 1, maxLength: 120 });
  for (const field of ["left", "top", "right", "bottom"])
    Object.assign(layout[field], { minimum: 0, maximum: 1 });
  Object.assign(layout.strokeWidth, { minimum: 0, maximum: 0.02 });
  const phrases = schema.properties.captionPhrases;
  // A long video with short/single-word captions can legitimately exceed 120.
  phrases.maxItems = Math.min(
    6000,
    Math.max(120, context.document?.words?.length || 0),
  );
  Object.assign(phrases.items.properties.text, { maxLength: 240 });
  for (const field of ["firstWord", "lastWord"])
    Object.assign(phrases.items.properties[field], { maxLength: 128 });
  schema.properties.operations.maxItems = supported.length ? 100 : 0;
  const operation = schema.properties.operations.items.properties;
  for (const field of ["target", "text"])
    Object.assign(operation[field], { maxLength: 240 });
  const media = operation.media.properties;
  for (const field of ["source", "time"])
    Object.assign(media[field], { minimum: 0 });
  Object.assign(media.lane, { minimum: 0, maximum: 6 });
  for (const field of ["centerX", "centerY"])
    Object.assign(media[field], { minimum: 0, maximum: 1 });
  Object.assign(media.width, { minimum: 0.1, maximum: 1 });
  for (const field of ["fadeIn", "fadeOut"])
    Object.assign(media[field], { minimum: 0, maximum: 10 });
  Object.assign(media.name, { minLength: 1, maxLength: 255 });
  return schema;
}

/** Retry an invalid proposal once, before returning anything to the editor.
 * @param {(state: {attempt: number, issue: string|null}) => Promise<any>} generate
 * @param {any} context
 * @param {AbortSignal} [signal]
 * @param {(event: {attempt: number, issue: string}) => void} [onRejected]
 */
export async function recoverChatReply(
  generate,
  context,
  signal,
  onRejected = () => {},
) {
  let issue = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    const reply = await generate({ attempt, issue });
    signal?.throwIfAborted();
    try {
      return validateChatReply(reply, context);
    } catch (error) {
      if (!(error instanceof ChatReplyError)) throw error;
      issue = error.message;
      onRejected({ attempt, issue });
      if (attempt === 1) throw error;
    }
  }
}

/** @param {any} reply @param {any} [context] */
export function validateChatReply(reply, context = null) {
  // Older app releases use the same endpoint. Accept their original response
  // shape while validating new patches against the current structured schema.
  const fill = (value, properties) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? {
          ...Object.fromEntries(
            Object.keys(properties).map((key) => [key, null]),
          ),
          ...value,
        }
      : value;
  const normalized = reply && {
    ...reply,
    captionFormat: reply.captionFormat ?? null,
    captionPhrases: reply.captionPhrases ?? [],
    referenceLayouts: reply.referenceLayouts ?? [],
    operations: Array.isArray(reply.operations)
      ? reply.operations.map((op) => ({
          ...Object.fromEntries(
            ["target", "start", "end", "value", "text"].map((key) => [
              key,
              null,
            ]),
          ),
          ...op,
          scope: op?.scope ?? null,
          style: fill(op?.style ?? null, styleProperties),
          crop: fill(op?.crop ?? null, cropProperties),
          media: fill(op?.media ?? null, mediaProperties),
        }))
      : reply.operations,
  };
  const schemaIssue = conforms(
    normalized,
    chatSchemaFor(context ?? { supportedOperations: chatOperationKinds }),
  );
  if (schemaIssue) throw new ChatReplyError(schemaIssue);
  if (!normalized.message.trim())
    throw new ChatReplyError("response.message: empty confirmation");
  for (let index = 0; index < normalized.referenceLayouts.length; index++) {
    const box = normalized.referenceLayouts[index];
    if (box.right <= box.left || box.bottom <= box.top)
      throw new ChatReplyError(
        `response.referenceLayouts[${index}]: bounds must have positive width and height`,
      );
    if (box.lines.some((line) => !line.trim()))
      throw new ChatReplyError(
        `response.referenceLayouts[${index}].lines: empty text line`,
      );
  }
  for (let index = 0; index < normalized.operations.length; index++)
    if (
      normalized.operations[index].media?.name != null &&
      !normalized.operations[index].media.name.trim()
    )
      throw new ChatReplyError(
        `response.operations[${index}].media.name: empty name`,
      );
  if (context?.document) {
    const doc = context.document;
    const known = new Set([
      ...(doc.segments || []).map((item) => item.id),
      ...(doc.texts || doc.captions || []).map((item) => item.id),
      ...(doc.overlays || []).map((item) => item.segment?.id || item.id),
      ...(doc.audioClips || []).map((item) => item.segment?.id || item.id),
    ]);
    for (let i = 0; i < normalized.operations.length; i++) {
      const target = normalized.operations[i].target;
      if (target !== null && !known.has(target))
        throw new ChatReplyError(
          `response.operations[${i}].target: unknown editor target`,
        );
    }
    if (Array.isArray(doc.words) && normalized.captionPhrases.length) {
      const wordIndex = new Map(
        doc.words.map((word, index) => [word.id, index]),
      );
      const used = new Set();
      for (let i = 0; i < normalized.captionPhrases.length; i++) {
        const phrase = normalized.captionPhrases[i];
        const first = wordIndex.get(phrase.firstWord),
          last = wordIndex.get(phrase.lastWord);
        if (first === undefined || last === undefined)
          throw new ChatReplyError(
            `response.captionPhrases[${i}]: use existing source word IDs`,
          );
        if (last < first || doc.words[first].clip !== doc.words[last].clip)
          throw new ChatReplyError(
            `response.captionPhrases[${i}]: word ranges must stay within one source`,
          );
        for (let index = first; index <= last; index++) {
          if (used.has(index))
            throw new ChatReplyError(
              `response.captionPhrases[${i}]: source words cannot appear in more than one phrase`,
            );
          used.add(index);
        }
      }
    }
  }
  return normalized;
}
