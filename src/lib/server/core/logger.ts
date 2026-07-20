import pino from "pino";
import "@tanstack/react-start/server-only";
import {getDisabledOptionalIntegrations, serverEnv} from "@/env/server";


const usePrettyLogs = process.env.NODE_ENV !== "production"
    && process.env.NODE_ENV !== "test"
    && process.stdout.isTTY;


export const logger = pino({
    name: "mylists",
    level: serverEnv.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: usePrettyLogs
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                ignore: "pid,hostname,name",
                translateTime: "SYS:standard",
            },
        }
        : undefined,
    redact: {
        paths: [
            "token",
            "secret",
            "apiKey",
            "cookie",
            "*.token",
            "password",
            "*.secret",
            "*.password",
            "headers.cookie",
            "*.authorization",
            "headers.authorization",
        ],
        censor: "[Redacted]",
    },
});


if (process.env.NODE_ENV !== "test") {
    const disabledIntegrations = getDisabledOptionalIntegrations(serverEnv);

    if (disabledIntegrations.length > 0) {
        logger.warn({ disabledIntegrations },
            "MyLists core features are ready, but some integrations are disabled. " +
            "Add the listed variables to .env and restart to enable the features.");
    }
    else {
        logger.info("MyLists core features and all optional integrations are configured.");
    }
}
