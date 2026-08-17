import tseslint from "typescript-eslint"

const forbiddenModules = [
  { name: "node:fs", message: "Use FileSystem from @effect/platform." },
  { name: "node:fs/promises", message: "Use FileSystem from @effect/platform." },
  { name: "fs", message: "Use FileSystem from @effect/platform." },
  { name: "fs/promises", message: "Use FileSystem from @effect/platform." },
  { name: "node:child_process", message: "Use ProcCommand (CommandExecutor)." },
  { name: "child_process", message: "Use ProcCommand (CommandExecutor)." },
  { name: "node:http", message: "Use HttpClient from @effect/platform." },
  { name: "http", message: "Use HttpClient from @effect/platform." },
  { name: "node-fetch", message: "Use HttpClient from @effect/platform." }
]

const restrictedProperties = [
  {
    object: "process",
    property: "env",
    message: "Use Config, never process.env."
  },
  {
    object: "process",
    property: "argv",
    message: "Only CliCommand.run may read process.argv."
  },
  {
    object: "Effect",
    property: "runPromise",
    message: "Effect.runPromise is allowed only in cli / test harness."
  }
]

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "knowledge/**",
      ".superpowers/**",
      "graphify-out/**"
    ]
  },
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-restricted-imports": ["error", { paths: forbiddenModules }],
      "no-console": "error",
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Use HttpClient from @effect/platform." }
      ],
      "no-restricted-properties": ["error", ...restrictedProperties],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "Default exports are forbidden."
        }
      ]
    }
  },
  {
    files: ["src/cli.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: forbiddenModules.filter((m) => m.name !== "node:http" && m.name !== "http")
        }
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Use Config, never process.env."
        },
        {
          object: "Effect",
          property: "runPromise",
          message: "Use NodeRuntime.runMain in cli."
        }
      ]
    }
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Use Config, never process.env."
        },
        {
          object: "process",
          property: "argv",
          message: "Only CliCommand.run may read process.argv."
        }
      ]
    }
  }
)
