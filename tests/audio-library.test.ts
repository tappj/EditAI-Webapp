import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

test("distributed music matches its reviewed CC0 provenance and asset inventory", async () => {
  const tracks = JSON.parse(
    await readFile(
      new URL("../lib/audio-library.json", import.meta.url),
      "utf8",
    ),
  );
  const sources = new Set([
    "https://opengameart.org/content/chillout-instrumentals-collection",
    "https://opengameart.org/content/funk-collection",
    "https://opengameart.org/content/retro-wave-collection",
  ]);
  const ids = new Set();
  for (const track of tracks) {
    assert.equal(track.license, "CC0-1.0");
    assert.ok(sources.has(track.source));
    assert.ok(!ids.has(track.id));
    ids.add(track.id);
    assert.match(track.url, /^\/audio-library\/[a-z0-9-]+\.m4a$/);
    const data = await readFile(
      new URL("../public" + track.url, import.meta.url),
    );
    assert.equal(data.length, track.bytes);
    assert.equal(createHash("sha256").update(data).digest("hex"), track.sha256);
    assert.ok(track.duration > 0 && track.duration < 900);
    assert.ok(track.bytes < 25 * 1024 * 1024);
    assert.match(track.originalSha256, /^[a-f0-9]{64}$/);
  }
  const files = await readdir(
    new URL("../public/audio-library/", import.meta.url),
  );
  assert.deepEqual(
    files.filter((f) => f.endsWith(".m4a")).sort(),
    tracks.map((t: { id: string }) => t.id + ".m4a").sort(),
  );
  assert.ok(
    (
      await readFile(
        new URL("../public/audio-library/CC0-1.0.txt", import.meta.url),
        "utf8",
      )
    ).includes("CC0 1.0 Universal"),
  );
});
