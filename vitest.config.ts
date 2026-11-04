import { defineConfig } from "vitest/config";

// The vite config sets root: "web" for the app build. Vitest needs its own
// config so `npm test` runs the bench/vision tests from the repo root.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
  },
});
