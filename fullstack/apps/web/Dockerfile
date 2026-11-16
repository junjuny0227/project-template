FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/pnpm/corepack"
ENV XDG_CACHE_HOME="/pnpm/cache"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global corepack@0.34.5 && corepack enable && corepack prepare pnpm@12.18.0 --activate && pnpm --version && chmod -R a+rX /pnpm
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @repo/web --docker

FROM base AS dependencies
COPY --from=pruner /app/out/json/ .
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY --from=pruner /app/out/full/ .
# API 주소는 rewrite에 포함되므로 빌드 인자로 필수 전달한다.
ARG API_BASE_URL
RUN API_BASE_URL="$API_BASE_URL" pnpm --filter @repo/web build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder --chown=node:node /app /app
WORKDIR /app/apps/web
USER node
EXPOSE 3000
CMD ["pnpm", "start", "--hostname", "0.0.0.0"]
