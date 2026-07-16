import pino from "pino";
import {serverEnv} from "@/env/server";
import "@tanstack/react-start/server-only";


export const logger = pino({
    name: "mylists",
    level: serverEnv.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
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
    ...(process.env.NODE_ENV === "development" && {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
            },
        },
    }),
});
