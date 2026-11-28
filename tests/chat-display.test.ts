import test from "node:test";
import assert from "node:assert/strict";
import { briefChatMessage } from "../lib/editor/chat-display.ts";
test("assistant bubbles keep a brief first sentence and cap long technical replies", () => {
  assert.equal(
    briefChatMessage("Matched your reference. Many internal details follow."),
    "Matched your reference.",
  );
  assert.ok(briefChatMessage("word ".repeat(60)).split(/\s+/).length <= 24);
});
