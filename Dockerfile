# syntax=docker/dockerfile:1

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
	PATH=/pnpm:$PATH \
	CI=true
RUN corepack enable

WORKDIR /src

# Dependencies first, so code changes don't reinstall them.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build \
	&& pnpm prune --prod --ignore-scripts

# ── Run ──────────────────────────────────────────────────────────────────────
FROM node:22-slim

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	HOME_CONFIG=/app/settings/config.yml \
	HOME_DATA=/app/data \
	HOME_ASSETS=/app/assets

WORKDIR /app
# Production dependencies only; everything else is bundled into build/.
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/build ./build
COPY --from=build /src/package.json ./package.json
COPY --from=build /src/config.example.yml ./config.example.yml

RUN mkdir -p /app/data /app/assets /app/settings && chown -R node:node /app/data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "build"]
