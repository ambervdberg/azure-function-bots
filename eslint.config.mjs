import typescriptEslint from '@typescript-eslint/eslint-plugin';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    plugins: {
      typescriptEslint: typescriptEslint
    },
    rules: {}
  },
  eslintPluginPrettierRecommended
];
