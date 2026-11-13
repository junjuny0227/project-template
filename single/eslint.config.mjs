import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,

  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'public/**',
    'next-env.d.ts',
    '**/*.d.ts',
  ]),

  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },

    settings: {
      react: {
        version: '19',
      },
    },

    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [['^react$'], ['^next(/.*)?$'], ['^@?\\w'], ['^@/'], ['^\\.']],
        },
      ],
      'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },

  {
    files: ['**/*.{ts,tsx,mts,cts}'],

    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },

    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'enum 대신 리터럴 유니온이나 as const 객체를 사용하세요.',
        },
      ],
    },
  },
  {
    // src 안의 모듈은 named export만 쓴다. Next가 default export를 요구하는 라우트 파일(루트 app/)과 설정 파일은 대상이 아니다.
    // 이 블록이 위 no-restricted-syntax를 덮어쓰므로 enum 금지도 함께 둔다.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'enum 대신 리터럴 유니온이나 as const 객체를 사용하세요.',
        },
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'src 안에서는 named export를 쓰세요. 라우트 파일에서 `export { X as default }`로 재수출합니다.',
        },
        {
          selector:
            "ExportSpecifier[exported.name='default'], ExportSpecifier[local.name='default']",
          message: 'src 안에서는 default export를 만들거나 재수출하지 않습니다.',
        },
      ],
    },
  },
]);

export default eslintConfig;
