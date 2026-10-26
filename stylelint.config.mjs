export default {
  ignoreFiles: [
    "dist/**",
    "node_modules/**",
    "**/*.d.ts",
    ".vscode/**",
    "src-tauri/target/**",
    "src-tauri/gen/schemas/**",
  ],

  extends: ["stylelint-config-standard"],

  overrides: [
    {
      files: ["*.scss", "**/*.scss"],
      customSyntax: "postcss-scss",
      extends: ["stylelint-config-standard-scss"],
    },
    {
      files: ["*.vue", "**/*.vue"],
      customSyntax: "postcss-html",
      extends: ["stylelint-config-standard-scss", "stylelint-config-standard-vue/scss"],
    },
  ],

  plugins: ["stylelint-declaration-block-no-ignored-properties"],

  rules: {
    "plugin/declaration-block-no-ignored-properties": true,

    "selector-pseudo-element-no-unknown": [
      true,
      {
        ignorePseudoElements: ["v-deep"],
      },
    ],

    "at-rule-empty-line-before": [
      "always",
      {
        except: ["blockless-after-same-name-blockless", "first-nested"],
        ignore: ["after-comment"],
        ignoreAtRules: ["else"],
      },
    ],

    "scss/comment-no-empty": null,
    "scss/operator-no-newline-after": null,
    "scss/operator-no-newline-before": null,

    "property-no-deprecated": null,
    "container-name-pattern": null,

    "selector-class-pattern": [
      "^[a-z]([a-z0-9-]+)?(__[a-z0-9-]+)?(--[a-z0-9-]+)?$",
      {
        message: "Expected class selector to be BEM-style (block__element--modifier)",
      },
    ],
  },
};
