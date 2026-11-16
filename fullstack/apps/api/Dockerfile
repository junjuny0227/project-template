FROM node:24-bookworm-slim AS base
# Prisma 마이그레이션 엔진에 필요한 OpenSSL과 인증서를 설치한다.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/pnpm/corepack"
ENV XDG_CACHE_HOME="/pnpm/cache"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global corepack@0.34.5 && corepack enable && corepack prepare pnpm@12.18.0 --activate && pnpm --version && chmod -R a+rX /pnpm
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @repo/api --docker

FROM base AS dependencies
COPY --from=pruner /app/out/json/ .
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY --from=pruner /app/out/full/ .
# build 스크립트는 Prisma 클라이언트 생성 후 TypeScript를 컴파일한다. DB 접속은 하지 않는다.
RUN pnpm --filter @repo/api build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=builder --chown=node:node /app /app
WORKDIR /app/apps/api
USER node
EXPOSE 4000
CMD ["pnpm", "start"]
