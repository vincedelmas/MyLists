FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

RUN --mount=type=bind,source=.env.docker,target=/app/.env \
    SKIP_ENV_VALIDATION=true \
    bun run build

FROM oven/bun:1.3.14 AS runtime

WORKDIR /app

ENV NODE_ENV=production

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
