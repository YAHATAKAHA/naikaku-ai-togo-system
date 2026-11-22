import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  plugins: [react()],
  root: resolve(projectRoot, "src/demo"),
  publicDir: resolve(projectRoot, "public"),
  build: {
    outDir: resolve(projectRoot, "output/huggingface-space"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(projectRoot, "src/demo/index.html")
    }
  }
});
