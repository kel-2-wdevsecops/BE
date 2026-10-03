// ESLint (flat config). `.mjs` karena package.json BE `"type": "commonjs"`.
// Dijalankan lewat `npm run lint` dan di CI (`.github/workflows/ci.yml`).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'src/generated/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      // Log server lewat morgan / prefix `[notify]` dll. Pemakaian console yang
      // disengaja ditandai `eslint-disable-next-line no-console`.
      'no-console': 'warn',
      // Parameter/variabel berawalan `_` sengaja tidak dipakai (mis. `_next` di
      // error middleware Express, yang wajib 4 parameter), begitu juga field
      // yang dibuang lewat rest destructuring (`{ deleted_at: _d, ...rest }`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
);
