import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]
  },
  ...compat.extends("next"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off"
    }
  },
];

export default eslintConfig;
