// Preserve the existing EditAI artwork and add a macOS-shaped transparent edge.
import { execFileSync } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile("desktop/build/icon.png");
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect x="28" y="28" width="968" height="968" rx="220" fill="white"/></svg>`);
const rounded = await sharp(source).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
await sharp(rounded).toFile("desktop/build/icon-mac.png");
await mkdir("desktop/build/icon.iconset", { recursive: true });
for (const size of [16, 32, 128, 256, 512]) {
  await sharp(rounded).resize(size, size).png().toFile(`desktop/build/icon.iconset/icon_${size}x${size}.png`);
  await sharp(rounded).resize(size * 2, size * 2).png().toFile(`desktop/build/icon.iconset/icon_${size}x${size}@2x.png`);
}
execFileSync("iconutil", ["-c", "icns", "desktop/build/icon.iconset", "-o", "desktop/build/icon.icns"], { stdio: "inherit" });
console.log("Rounded macOS icon generated from the original EditAI artwork.");
