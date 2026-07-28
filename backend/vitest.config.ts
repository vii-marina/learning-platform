import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests live outside `src/` so the deploy build (`tsc -p tsconfig.json`,
    // rootDir src) never emits them into `dist/`.
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setupEnv.ts"],
  },
});
