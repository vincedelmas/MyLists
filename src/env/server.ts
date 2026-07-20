import * as z from "zod";
import path from "node:path";
import {homedir} from "node:os";
import {createEnv} from "@t3-oss/env-core";
import "@tanstack/react-start/server-only";


export const serverEnv = createEnv({
    server: {
        // Database
        DATABASE_URL: z.string().default("./instance/site.db"),

        // Image/Cover Managements
        UPLOADS_DIR_NAME: z.string().default("static"),
        BASE_UPLOADS_LOCATION: z.string().default("./public/static/"),

        // Admin Secrets
        ADMIN_MAIL_USERNAME: z.email().optional(),
        ADMIN_PASSWORD: z.string().min(8),
        ADMIN_TOKEN_SECRET: z.string().min(20),
        ADMIN_MAIL_PASSWORD: z.string().min(8).optional(),
        ADMIN_TTL_COOKIE_MIN: z.coerce.number().int().default(10),

        // Logging
        LOG_LEVEL: z.string().trim().default("info"),
        ADMIN_LOG_PREFIX: z.string().trim().default("mylists-"),
        ADMIN_LOG_MAX_BYTES: z.coerce.number().default(10 * 1024 * 1024),
        ADMIN_LOG_DIR: z.string().default(path.join(homedir(), ".pm2", "logs")),

        // Redis
        CACHE_TTL_MIN: z.coerce.number().int().default(5),
        REDIS_URL: z.url().default("redis://localhost:6379"),
        REDIS_ENABLED: z.string().transform((s) => s !== "false" && s !== "0").default(false),

        // Better-Auth
        BETTER_AUTH_SECRET: z.string().min(20),

        // OAuth2 Providers
        GITHUB_CLIENT_ID: z.string().trim().min(1).optional(),
        GITHUB_CLIENT_SECRET: z.string().trim().min(1).optional(),
        GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
        GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),

        // ApiKeys
        THEMOVIEDB_API_KEY: z.string().trim().min(1).optional(),
        GOOGLE_BOOKS_API_KEY: z.string().trim().min(1).optional(),
        IGDB_CLIENT_ID: z.string().trim().min(1).optional(),
        IGDB_CLIENT_SECRET: z.string().trim().min(1).optional(),

        // LLM ROUTER
        LLM_API_KEY: z.string().trim().min(1).optional(),
        LLM_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
        LLM_MODEL_ID: z.string().trim().min(1).default("google/gemini-2.5-flash-lite"),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});


const optionalCredentialPairs = [
    ["ADMIN_MAIL_USERNAME", "ADMIN_MAIL_PASSWORD"],
    ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ["IGDB_CLIENT_ID", "IGDB_CLIENT_SECRET"],
] as const;


for (const [first, second] of optionalCredentialPairs) {
    if (serverEnv[first] && !serverEnv[second]) {
        throw new Error(`Invalid env config: ${second} is required when ${first} is set.`);
    }
    if (serverEnv[second] && !serverEnv[first]) {
        throw new Error(`Invalid env config: ${first} is required when ${second} is set.`);
    }
}


const optionalIntegrations = [
    {
        feature: "Email registration, password reset, and mail delivery",
        envVars: ["ADMIN_MAIL_USERNAME", "ADMIN_MAIL_PASSWORD"],
    },
    {
        feature: "GitHub sign-in",
        envVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    },
    {
        feature: "Google sign-in",
        envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    },
    {
        feature: "Movie, Series, and Anime provider (TMDB)",
        envVars: ["THEMOVIEDB_API_KEY"],
    },
    {
        feature: "Game provider (IGDB)",
        envVars: ["IGDB_CLIENT_ID", "IGDB_CLIENT_SECRET"],
    },
    {
        feature: "LLM book genre enrichment",
        envVars: ["LLM_API_KEY"],
    },
] as const satisfies ReadonlyArray<{
    feature: string;
    envVars: ReadonlyArray<keyof typeof serverEnv>;
}>;


type OptionalIntegrationEnvVar = typeof optionalIntegrations[number]["envVars"][number];
type OptionalIntegrationEnv = Partial<Pick<typeof serverEnv, OptionalIntegrationEnvVar>>;


export const getDisabledOptionalIntegrations = (env: OptionalIntegrationEnv) => {
    return optionalIntegrations.flatMap(({ feature, envVars }) => {
        const missingEnvVars = envVars.filter((envVar) => !env[envVar]);

        return missingEnvVars.length > 0
            ? [{ feature, missingEnvVars }]
            : [];
    });
};
