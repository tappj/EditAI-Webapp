import { build as viteBuild } from "vite";
import { build } from "esbuild";
import {
  mkdir,
  copyFile,
  writeFile,
  readFile,
  cp,
  chmod,
  readdir,
  unlink,
  rmdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve, dirname, join } from "node:path";
const require = createRequire(import.meta.url),
  root = resolve("."),
  out = join(root, "desktop/dist");
await mkdir(out, { recursive: true });
await mkdir("desktop/bin", { recursive: true });
await viteBuild({ configFile: resolve("desktop/vite.config.mjs") });
await build({
  entryPoints: ["desktop/main.mjs"],
  outfile: join(out, "main.mjs"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  external: ["electron"],
  banner: {
    js: "import {createRequire} from 'node:module';const require=createRequire(import.meta.url);",
  },
});
await copyFile("desktop/preload.cjs", join(out, "preload.cjs"));
for (const name of ["gate.html", "gate.js"])
  await copyFile("desktop/renderer/" + name, join(out, "renderer", name));
await cp("drizzle", join(out, "migrations"), { recursive: true });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const nativeBuild = await readFile("desktop/bin/native-build.json", "utf8")
  .then(JSON.parse)
  .catch(() => null);
const customNative =
  nativeBuild?.platform === process.platform + "-" + process.arch;
if (
  customNative &&
  (sha256(await readFile("desktop/bin/ffmpeg")) !== nativeBuild.ffmpegSha256 ||
    sha256(await readFile("desktop/bin/ffprobe")) !== nativeBuild.ffprobeSha256)
)
  throw Error("Native build hashes changed; rebuild from source.");
const ffmpeg = customNative
  ? resolve("desktop/bin/ffmpeg")
  : require("ffmpeg-static");
// ffprobe-static 3.x ships an Intel-only Mac binary. Pin the matching upstream
// release and verify GitHub's published SHA-256 before packaging each platform.
const probes = {
  "darwin-arm64":
    "bb2db6f5d8cef919da12fbf592119a987202a8c060a886f3cab091f9cab90b64",
  "darwin-x64":
    "fa3add0ce901f7241abe0dfc0155d958fc834aca3f8ce61f87cc712ae669c1e0",
  "win32-x64":
    "3a7e2dc003dc2cd1472827e4c7c4f056ae1ae0ae7c5bbc580c99b49827351ba4",
};
const platform = process.platform + "-" + process.arch,
  digest = probes[platform];
if (!digest)
  throw Error("Native binaries have not been validated for " + platform);
const ffprobe = resolve(
  "desktop/bin/ffprobe" + (process.platform === "win32" ? ".exe" : ""),
);
const valid = (bytes) =>
  createHash("sha256").update(bytes).digest("hex") === digest;
if (
  !customNative &&
  !valid(await readFile(ffprobe).catch(() => Buffer.alloc(0)))
) {
  const response = await fetch(
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffprobe-" +
      platform,
  );
  if (!response.ok) throw Error("Could not download pinned FFprobe binary.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!valid(bytes)) throw Error("FFprobe checksum mismatch.");
  await writeFile(ffprobe, bytes, { mode: 0o755 });
}
for (const [name, path] of [
  ["ffmpeg", ffmpeg],
  ["ffprobe", ffprobe],
]) {
  const target = join(
    root,
    "desktop/bin",
    name + (process.platform === "win32" ? ".exe" : ""),
  );
  if (resolve(path) !== resolve(target)) await copyFile(path, target);
  await chmod(target, 0o755);
}
// Executing both binaries catches architecture mismatches before release.
for (const name of ["ffmpeg", "ffprobe"])
  execFileSync(
    join(
      root,
      "desktop/bin",
      name + (process.platform === "win32" ? ".exe" : ""),
    ),
    ["-version"],
    { stdio: "ignore" },
  );
await mkdir(join(out, "notices"), { recursive: true });
await copyFile(
  customNative ? "desktop/bin/FFmpeg-LICENSE.txt" : ffmpeg + ".LICENSE",
  join(out, "notices/FFmpeg-LICENSE.txt"),
);
await copyFile(
  customNative ? "desktop/bin/FFmpeg-README.txt" : ffmpeg + ".README",
  join(out, "notices/FFmpeg-README.txt"),
);
await copyFile("desktop/THIRD-PARTY.md", join(out, "notices/THIRD-PARTY.md"));

if (customNative)
  await copyFile(
    "desktop/bin/native-build.json",
    join(out, "notices/native-build.json"),
  );
const licenseReport = [];
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
for (const [path, meta] of Object.entries(packageLock.packages)) {
  if (!path || meta.dev) continue;
  const name = path.split("node_modules/").at(-1);
  licenseReport.push(
    `${name}@${meta.version} (${meta.license || "see package"})`,
  );
  const files = await readdir(path).catch(() => []);
  for (const file of files.filter((n) =>
    /^(license|licence|copying|notice)(\.|$)/i.test(n),
  )) {
    const content = await readFile(join(path, file), "utf8").catch(() => null);
    if (content) licenseReport.push(content);
  }
}
await writeFile(
  join(out, "notices/DEPENDENCY-LICENSES.txt"),
  licenseReport.join("\n\n"),
);

const token =
  process.env.PUBLIK_DESKTOP_APP_TOKEN ||
  (await readFile("desktop/publik-app-token.txt", "utf8").catch(() => null));
if (token)
  await writeFile(join(out, "publik-app-token.txt"), token.trim(), {
    mode: 0o600,
  });
for (const name of await readdir(join(out, "renderer/ffmpeg")).catch(() => []))
  await unlink(join(out, "renderer/ffmpeg", name));
await rmdir(join(out, "renderer/ffmpeg")).catch(() => {});
await writeFile(
  join(out, "package.json"),
  JSON.stringify(
    {
      name: "editai-desktop",
      version: "0.2.0",
      type: "module",
      main: "main.mjs",
      description: "EditAI local video editing studio",
      author: "Jadon Tapp",
      private: true,
      dependencies: {},
    },
    null,
    2,
  ),
);
console.log(
  "Desktop assets and native services built. No credentials were printed.",
);
