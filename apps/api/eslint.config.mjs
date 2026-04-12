import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/modules/feed-import/feed-processor.service.ts', 'src/modules/feed-import/feed-import.service.ts'],
    rules: {
      // TrendAgent JSON — полуструктурированные записи; строгая типизация каждого поля — отдельная задача
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
