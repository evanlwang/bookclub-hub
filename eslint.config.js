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
        // DSYS-TOOL-001: ban inline `style` literals containing raw color values.
        // Token references via `var(--token-name)` are allowed; only literal
        // oklch/hsl/rgb/hex are flagged. Exempt files use file-level
        // eslint-disable comments citing the spec ID (currently book-cover.tsx
        // per COMP-BOOK-COVER-010 and chapter-chip.tsx per COMP-CHAPTER-CHIP-004).
        {
          selector: "JSXAttribute[name.name='style'] Literal[value=/oklch\\(|hsla?\\(|rgba?\\(|#[0-9a-fA-F]{3,8}\\b/]",
          message:
            "Inline style literals containing raw color values violate DSYS-TOKEN-003. Use Tailwind utility classes (bg-primary, text-ink) or `var(--token-name)`. See docs/specs/dsys-specs.md.",
        },
        // DSYS-TOOL-001: same ban for Tailwind arbitrary-value color classes.
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/(?:bg|text|border|ring|fill|stroke|outline|shadow|from|to|via)-\\[(?:oklch|hsla?|rgba?|#[0-9a-fA-F])/]",
          message:
            "Tailwind arbitrary-value color classes (e.g., `text-[oklch(...)]`) violate DSYS-TOKEN-003. Use the token utility (e.g., `text-warning-ink`) or add a token if one is missing.",
        },
        // DSYS-TOOL-001: same ban for SVG fill/stroke attributes.
        {
          selector: "JSXAttribute[name.name=/^(fill|stroke)$/] Literal[value=/oklch\\(|hsla?\\(|rgba?\\(|#[0-9a-fA-F]{3,8}\\b/]",
          message:
            "SVG fill/stroke with raw color values violates DSYS-TOKEN-003. Use `var(--token-name)` or `currentColor`. See docs/llds/components-icons.md for the LogoIcon bridging pattern.",
        },
      ],
    },
  },
);
