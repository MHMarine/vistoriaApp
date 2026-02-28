const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier, // Mantém a paz entre ESLint e Prettier
  {
    ignores: [
      "dist/**",
      "build/**",
      ".expo/**",
      ".expo-shared/**",
      ".turbo/**",
      ".cache/**",
      "node_modules/**",
      "android/**",
      "ios/**",
      "web-build/**",
      "coverage/**",
    ],
  },
];