import { execFileSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { pathToFileURL } from "node:url";

// These are detection signatures, not a copy of the proprietary instructions.
// Split literals keep this checker from matching its own tracked source.
const promptMarkers = [
  ["eva", "You are EditAI, a precise " + "video editing assistant"],
  ["selection", "You are EditAI's editor " + "for videos"],
  ["retake-review", "Review ONLY the flagged " + "local retakes"],
  ["director", "You are the executive director editing " + "RAW, UNEDITED footage"],
  ["reference", "REFERENCE MATCHING — " + "TWO PRIORITIES:"],
  ["reference-examples", "REFERENCE OUTPUT " + "EXAMPLES:"],
].map(([name, text]) => [name, Buffer.from(text)]);
const privateModules = new Set([
  "lib/ios/" + "selection.mjs",
  "lib/ios/" + "editorial.mjs",
  "lib/ios/" + "reference-scripts.mjs",
]);
const promptExports = new RegExp(
  "export\\s+(?:const|function)\\s+(?:" +
    ["instructionsFor" + "Chat", "chat" + "Instructions", "reference" + "Instructions", "selection" + "Instructions", "selectionReview" + "Instructions", "refinement" + "Instructions", "audit" + "Instructions"].join("|") +
    ")\\b",
);
const modes = new Set(["tracked", "browser", "desktop", "all"]);

/** Only report paths and fixed rule names, never matched source or credentials. */
export async function checkPublicBoundary(root, mode = "tracked") {
  root = resolve(root);
  if (!modes.has(mode)) throw new Error("Unknown public boundary check mode.");
  const failures = [];
  let scanned = 0;
  const fail = (path, rule) => failures.push({ path, rule });
  const name = (path) => relative(root, path).split("\\").join("/");
  const privatePath = (path) => /(^|\/)\.private-ai(?:\/|$)/.test(path);

  async function inspect(path, artifact) {
    const display = name(path);
    let metadata;
    try {
      metadata = await lstat(path);
    } catch {
      fail(display, "file-unreadable");
      return;
    }
    if (metadata.isSymbolicLink() || !metadata.isFile()) {
      fail(display, "non-regular-file");
      return;
    }
    if (privatePath(display) || privateModules.has(display)) {
      fail(display, "private-module");
      return;
    }
    if (/(^|\/)\.env(?:\.|$)|(^|\/)\.dev\.vars(?:\.|$)/.test(display)) {
      fail(display, "environment-file");
      return;
    }
    if (artifact && /\.map$/i.test(display))
      fail(display, "production-source-map");
    let bytes;
    try {
      bytes = await readFile(path);
    } catch {
      fail(display, "file-unreadable");
      return;
    }
    scanned++;
    for (const [label, marker] of promptMarkers)
      if (bytes.includes(marker)) fail(display, "private-prompt-" + label);
    if (/\.(?:[cm]?[jt]sx?|json|map)$/i.test(display)) {
      const text = bytes.toString("utf8");
      if (promptExports.test(text)) fail(display, "private-prompt-export");
      // An inline source map is just as publishable as a separate map file.
      if (artifact && /sourceMappingURL\s*=\s*data:/i.test(text))
        fail(display, "inline-production-source-map");
    }
  }

  async function tree(directory) {
    let metadata;
    try {
      metadata = await lstat(directory);
    } catch {
      fail(name(directory), "build-directory-missing");
      return;
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail(name(directory), "build-directory-invalid");
      return;
    }
    const entries = await readdir(directory, { withFileTypes: true });
    if (!entries.length) fail(name(directory), "build-directory-empty");
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (privatePath(name(path))) {
        fail(name(path), "private-module");
      } else if (entry.isDirectory()) {
        await tree(path);
      } else {
        await inspect(path, true);
      }
    }
  }

  if (mode === "tracked" || mode === "all") {
    let tracked;
    try {
      tracked = execFileSync("git", ["ls-files", "--cached", "-z"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).split("\0").filter(Boolean);
    } catch {
      fail(".", "git-inventory-unavailable");
      tracked = [];
    }
    if (!tracked.length) fail(".", "tracked-inventory-empty");
    for (const path of tracked) await inspect(join(root, path), false);
  }
  if (mode === "browser" || mode === "all") {
    const dir = join(root, "dist/client");
    await tree(dir);
    // A directory containing only miscellaneous static files is not a build.
    try {
      const entry = await lstat(join(dir, "_next"));
      if (!entry.isDirectory() || entry.isSymbolicLink())
        fail("dist/client/_next", "browser-entry-missing");
    } catch {
      fail("dist/client/_next", "browser-entry-missing");
    }
  }
  if (mode === "desktop" || mode === "all") {
    const dir = join(root, "desktop/dist");
    await tree(dir);
    // Explicit inspection makes an absent main entry a failure even if a
    // partially prepared renderer directory remains from a previous build.
    try {
      const entry = await lstat(join(dir, "main.mjs"));
      if (!entry.isFile() || entry.isSymbolicLink())
        fail("desktop/dist/main.mjs", "desktop-entry-missing");
    } catch {
      fail("desktop/dist/main.mjs", "desktop-entry-missing");
    }
  }
  return { ok: failures.length === 0, mode, scanned, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode = "tracked", ...extra] = process.argv.slice(2);
  if (!modes.has(mode) || extra.length) {
    process.stderr.write("Usage: node scripts/check-public-boundary.mjs [tracked|browser|desktop|all]\n");
    process.exitCode = 2;
  } else {
    const result = await checkPublicBoundary(process.cwd(), mode);
    for (const failure of result.failures)
      process.stderr.write(`${failure.path}: ${failure.rule}\n`);
    process.stdout.write(`Public boundary ${result.ok ? "passed" : "FAILED"}: ${mode}, ${result.scanned} files checked.\n`);
    process.exitCode = result.ok ? 0 : 1;
  }
}
