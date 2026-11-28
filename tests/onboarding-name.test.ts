import test from "node:test";
import assert from "node:assert/strict";
import { onboardingDisplayName } from "../lib/editor/profile.ts";
test("onboarding requires a bounded first name and keeps last name optional", () => {
  assert.equal(onboardingDisplayName("   "), null);
  assert.equal(onboardingDisplayName(null), null);
  assert.equal(onboardingDisplayName("Jadon"), "Jadon");
  assert.equal(onboardingDisplayName("  Jadon ", " Tapp "), "Jadon Tapp");
  assert.equal(onboardingDisplayName("a".repeat(41)), null);
  assert.equal(onboardingDisplayName("Jadon", "a".repeat(40)), null);
  assert.equal(
    onboardingDisplayName("a".repeat(40), "b".repeat(39))?.length,
    80,
  );
  assert.equal(onboardingDisplayName("Jadon\n"), null);
  assert.equal(onboardingDisplayName("李", "王"), "李 王");
  assert.equal(
    onboardingDisplayName("José", "D’Arcy-Smith"),
    "José D’Arcy-Smith",
  );
});
