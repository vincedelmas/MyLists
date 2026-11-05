import pino from "pino";
import path from "node:path";
import "@tanstack/react-start/server-only";
import {createStream} from "rotating-file-stream";
import {getDisabledOptionalIntegrations, serverEnv} from "@/env/server";


export const loggingConfig = {
    rotatedFiles: 5,
    filePrefix: "mylists-",
    maxFileBytes: 2 * 1024 * 1024,
    writeFiles: process.env.NODE_ENV === "production",
    level: process.env.NODE_ENV === "test" ? "silent" : "info",
    directory: process.env.NODE_ENV === "production" ? "/data/logs" : path.resolve("logs"),
};


const usePrettyLogs = process.env.NODE_ENV !== "production"
    && process.env.NODE_ENV !== "test"
    && process.stdout.isTTY;


const fileStream = loggingConfig.writeFiles
    ? createStream(`${loggingConfig.filePrefix}app.log`, {
        path: loggingConfig.directory,
        rotate: loggingConfig.rotatedFiles,
        size: `${Math.floor(loggingConfig.maxFileBytes * 0.8)}B`,
    })
    : undefined;


export const logger = pino({
    name: "mylists",
    level: loggingConfig.level,
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
}, fileStream ? pino.multistream([
    { level: "trace", stream: process.stdout },
    { level: "trace", stream: fileStream },
]) : undefined);


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
