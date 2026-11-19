import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export default defineConfig({
  root: root + "desktop/renderer",
  publicDir: root + "public",
  plugins: [react()],
  resolve: { alias: { "@": root } },
  css: { postcss: root },
  build: {
    outDir: root + "desktop/dist/renderer",
    emptyOutDir: true,
    rolldownOptions: {
      input: [
        root + "desktop/renderer/index.html",
        root + "desktop/renderer/gate.html",
      ],
    },
  },
});
