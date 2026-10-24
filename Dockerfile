ARG BUN_VERSION=1.4.4
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .


ARG VITE_BASE_URL
ARG VITE_CONTACT_MAIL
ARG VITE_PUBLIC_POSTHOG_KEY
ARG VITE_PUBLIC_POSTHOG_HOST
RUN test -n "$VITE_BASE_URL"
RUN mkdir -p /tmp/build-db && \
    VITE_BASE_URL="$VITE_BASE_URL" \
    VITE_CONTACT_MAIL="$VITE_CONTACT_MAIL" \
    VITE_PUBLIC_POSTHOG_KEY="$VITE_PUBLIC_POSTHOG_KEY" \
    VITE_PUBLIC_POSTHOG_HOST="$VITE_PUBLIC_POSTHOG_HOST" \
    DATABASE_URL=/tmp/build-db/site.db \
    SKIP_ENV_VALIDATION=true \
    bun run build


FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=/data/database/site.db \
    BASE_UPLOADS_LOCATION=/data/images \
    UPLOADS_DIR_NAME=images \
    REDIS_URL=redis://redis:6379

COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --chown=bun:bun package.json bun.lock drizzle.config.ts tsconfig.json ./
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun drizzle ./drizzle
COPY --chown=bun:bun public ./public
RUN mkdir -p /data/database /data/images && chown -R bun:bun /data
USER bun
EXPOSE 3000


CMD ["bun", "dist/server.js"]
