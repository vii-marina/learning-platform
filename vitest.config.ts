import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so the production build never has to resolve
// vitest. Pure-logic suite only: no jsdom, no component rendering yet.
export default defineConfig({
  test: {
    environment: "node",
    include: ["frontend/**/*.test.ts"],
    exclude: ["**/node_modules/**", "dist/**", "backend/**"],
  },
});
