import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/', 'coverage/', 'web/'] },
  js.configs.recommended,
  { files: ['**/*.js'], languageOptions: { globals: globals.node } },
  { files: ['public/**/*.js'], languageOptions: { globals: globals.browser } },
  prettier,
];
