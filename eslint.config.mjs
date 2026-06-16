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
  {
    files: ["app/**/*.{js,ts,jsx,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "firebase/firestore",
              "importNames": ["updateDoc", "setDoc", "deleteDoc", "addDoc"],
              "message": "❌ UI NÃO PODE ESCREVER NO FIREBASE: Use a Mutation Layer (lib/contracts/mutations) para todas as operações de escrita."
            }
          ],
          "patterns": [
            {
              "group": ["@/lib/services/*", "@/lib/services/**"],
              "message": "❌ UI NÃO PODE ACESSAR SERVICES DIRETOS: Use a Mutation Layer (lib/contracts/mutations) para invocar regras de negócio e integrações de banco."
            }
          ]
        }
      ]
    }
  }
];

export default eslintConfig;
