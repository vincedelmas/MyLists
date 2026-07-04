import z from "zod";
import {auth} from "@/lib/server/core/auth";
import {createMiddleware} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {getContainer} from "@/lib/server/core/container";
import {DEFAULT_ERROR_MESSAGE} from "@/lib/utils/constants";
import {isNotFound, isRedirect} from "@tanstack/react-router";
import {FormattedError, FormZodError, UnauthorizedError, ValidationError} from "@/lib/utils/error-classes";


/**
 * Error Types and Logic
 * redirect: thrown in code but returned and handled frontend side by tanstack router.
 * notFound: thrown in code but returned and handled frontend side by tanstack router.
 * FormattedError: Expected Error with pre-formatted message for frontend side.
 * FormZodError: Error occurred during Form submission, return the Zod error.
 * ZodError: Unexpected Error on validation, return generic error message.
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
        if (process.env.NODE_ENV !== "production") {
            console.error("ServerFunc Error:", { err });
        }

        if (isRedirect(err) || isNotFound(err) || err instanceof FormattedError || err instanceof UnauthorizedError) {
            throw err;
        }

        await saveErrorToDb(err).catch();

        if (err instanceof FormZodError || err instanceof ValidationError) {
            throw err;
        }

        throw new Error(DEFAULT_ERROR_MESSAGE, { cause: err });
    }
});


export const reqErrorMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
    try {
        const results = await next();
        return results;
    }
    catch (err: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Request Error:", { err });
        }

        await saveErrorToDb(err).catch();

        throw new Error(DEFAULT_ERROR_MESSAGE, { cause: err });
    }
});


const saveErrorToDb = async (err: any) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    const adminService = await getContainer().then((c) => c.services.admin);

    const addErrorExtra = (err: unknown) => {
        if (err instanceof FormZodError || err instanceof z.ZodError) {
            return { issues: err.issues.map(({ input: _input, ...issue }) => issue) };
        }
        return null;
    };

    const stack = {
        url: request.url,
        method: request.method,
        stack: err?.stack ?? null,
        extra: addErrorExtra(err),
        referer: request.headers.get("Referer"),
        userAgent: request.headers.get("User-agent"),
        userInfo: session?.user ? { id: session.user.id, username: session.user.name } : null,
    }

    await adminService.saveErrorToDb({
        stack: JSON.stringify(stack),
        name: err?.name ?? "UnknownError",
        message: err?.message ?? "No message provided",
    });
}
