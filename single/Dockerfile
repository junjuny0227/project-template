FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/pnpm/corepack"
ENV XDG_CACHE_HOME="/pnpm/cache"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global corepack@0.34.5 && corepack enable && corepack prepare pnpm@12.18.0 --activate && pnpm --version && chmod -R a+rX /pnpm
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
# rewrite와 공개 모킹 플래그는 빌드 시 고정되므로 대상 API마다 이미지를 다시 만든다.
ARG API_BASE_URL
ENV NEXT_PUBLIC_API_MOCKING=disabled
RUN API_BASE_URL="$API_BASE_URL" pnpm build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_MOCKING=disabled
ENV PORT=3000
COPY --from=builder --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["pnpm", "start", "--hostname", "0.0.0.0"]
