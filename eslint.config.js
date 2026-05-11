import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      ".next/",
      "node_modules/",
      "playwright-report/",
      "test-results/",
      "coverage/",
      "prisma/migrations/",
      "src/generated/",
      "next-env.d.ts",
      "docs/lid/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        // Node + browser globals (TS already type-checks these; this just
        // silences eslint's no-undef for non-TS files and JSX in .tsx).
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        File: "readonly",
        Blob: "readonly",
        AbortController: "readonly",
        crypto: "readonly",
        structuredClone: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLFormElement: "readonly",
        Element: "readonly",
        Event: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        Node: "readonly",
        NodeJS: "readonly",
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      // TypeScript already type-checks identifiers; eslint's no-undef
      // produces false positives on TS-only constructs (enums, types).
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/exhaustive-deps": "warn",
      // Ban raw fetches into the tRPC endpoint — use trpc.* hooks from
      // src/trpc/react-hooks.ts (or utils.x.fetch for imperative orchestration).
      // See docs/trpc-adoption-plan.md.
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch'] > Literal[value=/^\\/api\\/trpc\\//]",
          message:
            "Do not call /api/trpc/* directly with fetch — use trpc.* hooks from @/trpc/react-hooks (or utils.x.fetch for imperative one-shots).",
        },
        {
          selector: "CallExpression[callee.name='fetch'] > TemplateLiteral[quasis.0.value.raw=/^\\/api\\/trpc\\//]",
          message:
            "Do not call /api/trpc/* directly with fetch — use trpc.* hooks from @/trpc/react-hooks (or utils.x.fetch for imperative one-shots).",
        },
      ],
    },
  },
);
