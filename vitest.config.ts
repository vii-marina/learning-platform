import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Kept separate from vite.config.ts so the production build never has to resolve vitest.
// The React plugin lives here rather than being shared because it is only needed to
// transform JSX for component tests; the build gets its own copy from vite.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    // Component tests need a DOM. The pure-logic tests run unchanged under jsdom, so one
    // environment is simpler than splitting the suite in two.
    environment: "jsdom",
    include: ["frontend/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "dist/**", "backend/**"],
    setupFiles: ["./frontend/test/setup.ts"],
    restoreMocks: true,
  },
});
