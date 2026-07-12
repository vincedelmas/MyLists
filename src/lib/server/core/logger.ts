import pino from "pino";
import path from "node:path";
import {mkdirSync} from "node:fs";
import {serverEnv} from "@/env/server";
import "@tanstack/react-start/server-only";


const loggerOptions: pino.LoggerOptions = {
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
};


const createDevLogDestination = () => {
    if (process.env.NODE_ENV !== "development") return null;

    mkdirSync(serverEnv.ADMIN_LOG_DIR, { recursive: true });

    return pino.destination({
        sync: false,
        dest: path.join(serverEnv.ADMIN_LOG_DIR, `${serverEnv.ADMIN_LOG_PREFIX}dev.log`),
    });
};


const devLogDestination = createDevLogDestination();


export const logger = devLogDestination
    ? pino(loggerOptions, pino.multistream([{ stream: process.stdout }, { stream: devLogDestination }]))
    : pino(loggerOptions);
