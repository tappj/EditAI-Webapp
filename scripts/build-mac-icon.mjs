// Preserve the existing EditAI artwork and add a macOS-shaped transparent edge.
import { execFileSync } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile("desktop/build/icon.png");
// macOS displays the whole canvas, including its transparent margins. Keep the
// visible tile within 824 px (100 px on each side), matching native app icons.
// Resize the complete artwork so the scissors retain their original proportions.
const tileSize = 824;
const inset = (1024 - tileSize) / 2;
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}"><rect width="${tileSize}" height="${tileSize}" rx="185" fill="white"/></svg>`);
const tile = await sharp(source).resize(tileSize, tileSize).ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
const rounded = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } })
  .composite([{ input: tile, left: inset, top: inset }]).png().toBuffer();
await sharp(rounded).toFile("desktop/build/icon-mac.png");
await mkdir("desktop/build/icon.iconset", { recursive: true });
for (const size of [16, 32, 128, 256, 512]) {
  await sharp(rounded).resize(size, size).png().toFile(`desktop/build/icon.iconset/icon_${size}x${size}.png`);
  await sharp(rounded).resize(size * 2, size * 2).png().toFile(`desktop/build/icon.iconset/icon_${size}x${size}@2x.png`);
}
execFileSync("iconutil", ["-c", "icns", "desktop/build/icon.iconset", "-o", "desktop/build/icon.icns"], { stdio: "inherit" });
console.log("Rounded macOS icon generated from the original EditAI artwork.");
