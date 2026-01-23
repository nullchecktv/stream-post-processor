import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/\\b(text|bg|border|ring|from|to|via)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\\b/]',
          message: 'Use CSS variables instead of Tailwind color utilities (e.g., text-gray-500). Replace with bg-[var(--color-surface)] or text-[var(--color-text-primary)].',
        },
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/\\b(text|bg|border|ring)-(white|black)\\b/]',
          message: 'Use CSS variables instead of absolute colors (white/black). Replace with var(--color-*) tokens.',
        },
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/\\b(text|bg|border|ring)-\\[#[0-9A-Fa-f]{3,8}\\]/]',
          message: 'Use CSS variables instead of arbitrary color values (e.g., bg-[#...]). Replace with bg-[var(--color-*)].',
        },
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/\\b(text|bg|border|ring)-\\[(rgb|rgba|hsl|hsla)\\(/]',
          message: 'Use CSS variables instead of arbitrary color values (e.g., bg-[rgb(...)]). Replace with bg-[var(--color-*)].',
        },
        {
          selector: 'JSXAttribute[name.name="style"] ObjectExpression Property[key.name=/^(color|backgroundColor|borderColor|borderTopColor|borderRightColor|borderBottomColor|borderLeftColor)$/]',
          message: 'Use CSS variables instead of inline style colors. Replace with var(--color-*) tokens.',
        },
      ],
    },
  },
])
