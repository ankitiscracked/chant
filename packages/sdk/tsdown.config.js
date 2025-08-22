import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./index.ts",
    "vad-processor": "./src/audio/vad-processor.js",
  },
  format: ["esm", "cjs"],
});
