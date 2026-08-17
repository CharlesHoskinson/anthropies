import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"],
    // CLI-spawn tests compile tsc then exec dist/cli.js; 5s default flakes on GHA.
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
})
