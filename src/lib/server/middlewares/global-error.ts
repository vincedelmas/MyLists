import z from "zod";
import {logger} from "@/lib/server/core/logger";
import {createMiddleware} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {DEFAULT_ERROR_MESSAGE} from "@/lib/utils/constants";
import {isNotFound, isRedirect} from "@tanstack/react-router";
import {FormattedError, UnauthorizedError, ValidationError} from "@/lib/utils/error-classes";


/**
 * Error Types and Logic
 * redirect: thrown in code but returned and handled frontend side by tanstack router.
 * notFound: thrown in code but returned and handled frontend side by tanstack router.
 * FormattedError: Expected Error with pre-formatted message for frontend side.
 * ValidationErrors: Expected Error from Forms with formatted field and message for frontend side.
 * Error: Unexpected Error anywhere, return generic error message.
 **/
export const funcErrorMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
    try {
        const results = await next();
        if ("error" in results && results.error !== undefined && !isRedirect(results.error) && !isNotFound(results.error)) {
            throw results.error;
        }

        return results;
    }
    catch (err) {
        if (isRedirect(err) || isNotFound(err) || err instanceof FormattedError || err instanceof UnauthorizedError) {
            throw err;
        }
        if (err instanceof ValidationError) {
            logger.warn({ err, request: getRequestLogPayload(err) }, "Server function validation error");
            throw err;
        }
        else {
            logger.error({ err, request: getRequestLogPayload(err) }, "Unhandled server function error");
            throw new Error(DEFAULT_ERROR_MESSAGE, { cause: err });
        }
    }
});


export const reqErrorMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
    try {
        const results = await next();
        return results;
    }
    catch (err: any) {
        logger.error({ err, request: getRequestLogPayload(err) }, "Unhandled request error");
        throw new Error(DEFAULT_ERROR_MESSAGE, { cause: err });
    }
});


const getRequestLogPayload = (err: unknown) => {
    const request = getRequest();

    const getErrorExtra = (err: unknown) => {
        if (err instanceof z.ZodError) {
            return { issues: err.issues.map(({ input: _input, ...issue }) => issue) };
        }

        return null;
    }

    return {
        url: request.url,
        method: request.method,
        extra: getErrorExtra(err),
        referer: request.headers.get("Referer"),
        userAgent: request.headers.get("User-agent"),
    };
}
