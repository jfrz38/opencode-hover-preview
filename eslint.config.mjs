import babelParser from "@babel/eslint-parser"
import cleanArchitecture from "@jfrz38/eslint-plugin-clean-architecture-highlighter"

export default [
  {
    ignores: ["node_modules/**", ".artifacts/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          plugins: [
            ["@babel/plugin-syntax-typescript", { allExtensions: true, isTSX: true }],
            "@babel/plugin-syntax-jsx",
          ],
        },
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      "clean-architecture-highlighter": cleanArchitecture,
    },
    rules: {
      "clean-architecture-highlighter/no-layer-violation": [
        "error",
        {
          sourceFolder: "src",
          layers: {
            domain: {
              aliases: ["core"],
              allowedDependencies: ["domain"],
            },
            application: {
              aliases: ["application"],
              allowedDependencies: ["domain", "application"],
            },
            infrastructure: {
              aliases: ["infrastructure"],
              allowedDependencies: ["domain", "application", "infrastructure"],
            },
          },
          ignoreTypeImports: false,
          ignoreExternalDependencies: true,
        },
      ],
    },
  },
]
