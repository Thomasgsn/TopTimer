import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import vueParser from "vue-eslint-parser";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "**/*.d.ts",
      ".vscode/**",
      "src-tauri/target/**",
      "src-tauri/gen/schemas/**",
    ],
  },
  ...pluginVue.configs["flat/recommended"],
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    files: ["**/*.{js,ts,vue}"],
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-expressions": "off",
      "vue/multi-word-component-names": "off",
    },
  },
];
