import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: ["out/**", "node_modules/**", "**/*.d.ts"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      eqeqeq: "warn",
      curly: "warn",
    },
  },
)
