import { Test } from '@nestjs/testing';
import { readFile, writeFile } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
import { format } from 'prettier';

import { AppModule } from './app.module.js';
import { validateEnv } from './config/env.js';
import { createOpenApiDocument } from './openapi.js';
import { PrismaService } from './prisma/prisma.service.js';

import 'reflect-metadata';

// 실제 설정 파일·환경 값은 읽지 않는다. DB 공급자를 교체하기 전에도 설정 검증은 통과해야 한다.
const module = await Test.createTestingModule({
  imports: [
    AppModule.register({
      ignoreEnvFile: true,
      ignoreEnvVars: true,
      validate: () =>
        validateEnv({
          NODE_ENV: 'test',
          PORT: 4000,
          DATABASE_URL: 'postgresql://openapi:openapi@127.0.0.1:1/openapi',
          JWT_SECRET: 'openapi-generation-only-not-a-runtime-secret',
          CORS_ORIGINS: 'http://localhost:3000',
        }),
    }),
  ],
})
  .overrideProvider(PrismaService)
  .useValue({})
  .compile();
const app = module.createNestApplication({ logger: false });
try {
  // init/listen을 호출하지 않아 생명주기 훅·DB 연결·포트 바인딩을 실행하지 않는다.
  const document = createOpenApiDocument(app);
  if (!document.paths['/health']?.get) throw new Error('OpenAPI에 GET /health가 없습니다.');
  const spec = await format(JSON.stringify(document), { parser: 'json' });
  const types =
    '// 자동 생성 파일입니다. 수정 후 pnpm openapi를 실행하세요.\n' +
    astToString(await openapiTS(JSON.stringify(document)));
  const outputs = [
    ['openapi.json', spec],
    ['openapi.d.ts', types],
  ] as const;
  let changed = false;
  for (const [name, content] of outputs) {
    const target = new URL(`../../../packages/api-types/${name}`, import.meta.url);
    if (process.argv.includes('--check')) {
      const previous = await readFile(target, 'utf8').catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
        return undefined;
      });
      if (previous !== content) {
        process.stderr.write(`OpenAPI 생성물 불일치: ${name}. pnpm openapi를 실행하세요.\n`);
        changed = true;
      }
    } else {
      await writeFile(target, content);
    }
  }
  if (changed) process.exitCode = 1;
} finally {
  await app.close();
}
