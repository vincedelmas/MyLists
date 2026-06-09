FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_BASE_URL=http://localhost:3000
ARG VITE_CONTACT_MAIL=
ARG VITE_PUBLIC_POSTHOG_KEY=
ARG VITE_PUBLIC_POSTHOG_HOST=
ARG VITE_PUBLIC_POSTHOG_UI_HOST=

RUN DATABASE_URL=./instance/build.db \
    UPLOADS_DIR_NAME=images \
    BASE_UPLOADS_LOCATION=/app/storage/images \
    ADMIN_PASSWORD=build-password \
    ADMIN_TOKEN_SECRET=build-token-secret-at-least-20-chars \
    ADMIN_MAIL_USERNAME=build@example.com \
    ADMIN_MAIL_PASSWORD=build-password \
    DEMO_PASSWORD=build-password \
    REDIS_ENABLED=false \
    REDIS_URL=redis://localhost:6379 \
    BETTER_AUTH_SECRET=build-auth-secret-at-least-20-chars \
    GITHUB_CLIENT_ID= \
    GITHUB_CLIENT_SECRET= \
    GOOGLE_CLIENT_ID= \
    GOOGLE_CLIENT_SECRET= \
    THEMOVIEDB_API_KEY= \
    GOOGLE_BOOKS_API_KEY= \
    IGDB_CLIENT_ID= \
    IGDB_CLIENT_SECRET= \
    LLM_MODEL_ID=google/gemini-2.5-flash-lite \
    LLM_BASE_URL=https://openrouter.ai/api/v1 \
    LLM_API_KEY= \
    VITE_BASE_URL="$VITE_BASE_URL" \
    VITE_CONTACT_MAIL="$VITE_CONTACT_MAIL" \
    VITE_PUBLIC_POSTHOG_KEY="$VITE_PUBLIC_POSTHOG_KEY" \
    VITE_PUBLIC_POSTHOG_HOST="$VITE_PUBLIC_POSTHOG_HOST" \
    VITE_PUBLIC_POSTHOG_UI_HOST="$VITE_PUBLIC_POSTHOG_UI_HOST" \
    bun run build

FROM oven/bun:1.3.14 AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/public/static /app/public/static
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/bun.lock /app/bun.lock
COPY --from=build /app/server.ts /app/server.ts
COPY --from=build /app/src /app/src
COPY --from=build /app/drizzle /app/drizzle
COPY --from=build /app/drizzle.config.ts /app/drizzle.config.ts
COPY --from=build /app/tsconfig.json /app/tsconfig.json
COPY docker/app-entrypoint.sh /usr/local/bin/mylists-entrypoint

RUN chmod +x /usr/local/bin/mylists-entrypoint

EXPOSE 3000

ENTRYPOINT ["mylists-entrypoint"]
CMD ["bun", "server.ts"]
