import test from "node:test";
import assert from "node:assert/strict";
import {
  chatSchemaFor,
  validateChatReply,
  recoverChatReply,
  ChatReplyError,
} from "../lib/ios/chat.mjs";

const context = { supportedOperations: ["addText", "captionStyle"] };
const reply = (operations: any[] = []) => ({
  message: "Added your title.",
  generateCaptions: false,
  operations,
});

test("legacy unused fields normalize without changing supported edit intent", () => {
  const input = reply([
    { kind: "addText", text: "Hello", style: { font: "tiktokClassic" } },
  ]);
  const snapshot = structuredClone(input);
  const output = validateChatReply(input, context);
  assert.equal(output.operations[0].text, "Hello");
  assert.equal(output.operations[0].target, null);
  assert.equal(output.operations[0].end, null);
  assert.equal(output.operations[0].style.font, "tiktokClassic");
  assert.equal(output.operations[0].style.outlineWidth, null);
  assert.deepEqual(output.captionPhrases, []);
  assert.deepEqual(input, snapshot);
  assert.throws(
    () => validateChatReply(reply([{ kind: "invented" }]), context),
    ChatReplyError,
  );
  assert.throws(
    () => validateChatReply(reply([{ kind: "addText", value: "10" }]), context),
    ChatReplyError,
  );
});

test("request schema advertises only client-supported tools", () => {
  assert.deepEqual(
    chatSchemaFor(context).properties.operations.items.properties.kind.enum,
    context.supportedOperations,
  );
  assert.equal(
    chatSchemaFor({ supportedOperations: [] }).properties.operations.maxItems,
    0,
  );
});

test("an invalid proposal is regenerated once and never partially returned", async () => {
  const calls: any[] = [],
    rejected: any[] = [];
  const result = await recoverChatReply(
    async (recovery: any) => {
      calls.push(recovery);
      return calls.length === 1
        ? reply([
            { kind: "addText", style: { font: "unavailable-private-string" } },
          ])
        : reply([{ kind: "addText", text: "Hello" }]);
    },
    context,
    undefined,
    (event: any) => rejected.push(event),
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].issue, null);
  assert.match(calls[1].issue, /operations\[0\].style.font: unsupported value/);
  assert.ok(!JSON.stringify(rejected).includes("private-string"));
  assert.equal(result.operations[0].text, "Hello");
});

test("persistent invalid output stops at two attempts; provider and cancellation errors are not retried", async () => {
  let calls = 0;
  await assert.rejects(
    recoverChatReply(async () => {
      calls++;
      return reply([{ kind: "addText" }, { kind: "delete" }]);
    }, context),
    ChatReplyError,
  );
  assert.equal(calls, 2);
  const paymentError = new Error("Payment required");
  calls = 0;
  await assert.rejects(
    recoverChatReply(async () => {
      calls++;
      throw paymentError;
    }, context),
    (e) => e === paymentError,
  );
  assert.equal(calls, 1);
  const controller = new AbortController();
  calls = 0;
  await assert.rejects(
    recoverChatReply(
      async () => {
        calls++;
        controller.abort();
        return reply([{ kind: "invented" }]);
      },
      context,
      controller.signal,
    ),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
});

test("reference phrase capacity follows source words and reports exact failed limits", () => {
  const longContext = {
    ...context,
    document: {
      words: Array.from({ length: 180 }, (_, i) => ({ id: String(i) })),
    },
  };
  const phrases = Array.from({ length: 150 }, (_, i) => ({
    firstWord: String(i),
    lastWord: String(i),
    text: "word",
  }));
  assert.equal(
    validateChatReply({ ...reply(), captionPhrases: phrases }, longContext)
      .captionPhrases.length,
    150,
  );
  assert.throws(
    () =>
      validateChatReply(
        { ...reply(), captionPhrases: [...phrases, ...phrases] },
        longContext,
      ),
    /response.captionPhrases: more than 180 items/,
  );
  assert.throws(
    () =>
      validateChatReply(
        reply([{ kind: "addText", media: { width: 1.2 } }]),
        context,
      ),
    /response.operations\[0\].media.width: above maximum 1/,
  );
  const schema = chatSchemaFor(longContext);
  assert.equal(schema.properties.referenceLayouts.maxItems, 2);
  assert.equal(
    schema.properties.referenceLayouts.items.properties.strokeWidth.maximum,
    0.02,
  );
  assert.equal(schema.properties.captionPhrases.maxItems, 180);
});

test("stale clip targets and invented caption anchors fail before any edit is returned", () => {
  const request = {
    ...context,
    document: {
      segments: [{ id: "existing" }],
      words: [{ id: "source:0", clip: 0 }],
    },
  };
  assert.throws(
    () =>
      validateChatReply(
        reply([{ kind: "addText", target: "guessed" }]),
        request,
      ),
    /operations\[0\].target: unknown editor target/,
  );
  assert.throws(
    () =>
      validateChatReply(
        {
          ...reply(),
          captionPhrases: [
            { firstWord: "invented", lastWord: "invented", text: "word" },
          ],
        },
        request,
      ),
    /captionPhrases\[0\]: use existing source word IDs/,
  );
});
