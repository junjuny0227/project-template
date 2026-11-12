import path from 'node:path';

const quote = (value) => JSON.stringify(value);
const lintPackages = [
  'apps/client',
  'apps/admin',
  'packages/ui',
  'packages/core',
  'packages/mocks',
];

export default {
  '*.{ts,tsx,mts,cts}': (files) =>
    lintPackages.flatMap((directory) => {
      const prefix = `${path.resolve(directory)}${path.sep}`;
      const matched = files.filter((file) => file.startsWith(prefix));
      return matched.length
        ? [`pnpm --dir ${quote(directory)} exec eslint --fix ${matched.map(quote).join(' ')}`]
        : [];
    }),
  '*.{ts,tsx,mts,cts,js,mjs,cjs,json,md,css,yaml,yml}': 'prettier --write',
};
