import * as z from "zod";
import {createEnv} from "@t3-oss/env-core";


export const serverEnv = createEnv({
    server: {
        // Database
        DATABASE_URL: z.string().default("./instance/site.db"),

        // Image/Cover Managements
        UPLOADS_DIR_NAME: z.string().default("static"),
        BASE_UPLOADS_LOCATION: z.string().default("./public/static/"),

        // Admin Secrets
        ADMIN_PASSWORD: z.string().min(8),
        ADMIN_TOKEN_SECRET: z.string().min(20),
        ADMIN_MAIL_USERNAME: z.email(),
        ADMIN_MAIL_PASSWORD: z.string().min(8),
        ADMIN_TTL_COOKIE_MIN: z.coerce.number().int().default(10),

        // DemoProfile
        DEMO_PASSWORD: z.string().min(8),

        // Redis
        CACHE_TTL_MIN: z.coerce.number().int().default(5),
        REDIS_URL: z.url().default("redis://localhost:6379"),
        REDIS_ENABLED: z.string().transform((s) => s !== "false" && s !== "0").default(false),

        // Better-Auth
        BETTER_AUTH_SECRET: z.string().min(20),

        // OAuth2 Providers
        GITHUB_CLIENT_ID: z.string(),
        GITHUB_CLIENT_SECRET: z.string(),
        GOOGLE_CLIENT_ID: z.string(),
        GOOGLE_CLIENT_SECRET: z.string(),

        // ApiKeys
        THEMOVIEDB_API_KEY: z.string(),
        GOOGLE_BOOKS_API_KEY: z.string(),
        IGDB_CLIENT_ID: z.string(),
        IGDB_CLIENT_SECRET: z.string(),

        // LLM ROUTER
        LLM_API_KEY: z.string(),
        LLM_MODEL_ID: z.string(),
        LLM_BASE_URL: z.string(),
    },
    runtimeEnv: process.env,
});


