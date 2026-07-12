import "@tanstack/react-start/server-only";
import {logger} from "@/lib/server/core/logger";


let installed = false;


const toErrorPayload = (err: unknown) => {
    if (err instanceof Error) return { err };
    return { err: { message: String(err), value: err } };
};


export const installProcessErrorHandlers = () => {
    if (installed) return;
    installed = true;

    process.on("unhandledRejection", (reason) => {
        logger.fatal(toErrorPayload(reason), "Unhandled promise rejection");
    });

    process.on("uncaughtException", (err) => {
        logger.fatal({ err }, "Uncaught exception");
        process.exitCode = 1;

        setTimeout(() => {
            process.exit(1);
        }, 250);
    });

    process.on("warning", (warning) => {
        logger.warn({ err: warning }, "Process warning");
    });
};
