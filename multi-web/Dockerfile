FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/pnpm/corepack"
ENV XDG_CACHE_HOME="/pnpm/cache"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global corepack@0.34.5 && corepack enable && corepack prepare pnpm@12.18.0 --activate && pnpm --version && chmod -R a+rX /pnpm
WORKDIR /app

FROM base AS pruner
ARG APP
RUN case "$APP" in client|admin) ;; *) printf 'APP는 client 또는 admin이어야 합니다\n' >&2; exit 1 ;; esac
COPY . .
RUN pnpm dlx turbo@2.11.10 prune "@repo/$APP" --docker

FROM base AS dependencies
COPY --from=pruner /app/out/json/ .
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM dependencies AS builder
ARG APP
ARG API_BASE_URL
ENV NEXT_PUBLIC_API_MOCKING=disabled
COPY --from=pruner /app/out/full/ .
RUN API_BASE_URL="$API_BASE_URL" pnpm --filter "@repo/$APP" build

FROM base AS runtime
ARG APP
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_MOCKING=disabled
COPY --from=builder --chown=node:node /app /app
WORKDIR /app/apps/${APP}
USER node
# start 스크립트가 client=3000, admin=3001로 고정한다.
EXPOSE 3000 3001
CMD ["pnpm", "start", "--hostname", "0.0.0.0"]
