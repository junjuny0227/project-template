import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: { include: ['src/**/*.spec.ts'], environment: 'node', reporters: ['verbose'] },
});
