import {ZodError} from "zod";
import {isNotFound} from "@tanstack/react-router";
import {FormattedError, InactiveMediaTypeError, UnauthorizedError, ValidationError} from "@/lib/utils/error-classes";
import {clientEnv} from "@/env/client";
import {logger} from "@/lib/server/core/logger";
import {getRequestUser} from "@/lib/server/core/request-user";

const json = (data: unknown, status = 200) => {
    return Response.json(data, {
        status,
        headers: {"Cache-Control": "private, no-store", Vary: "Cookie"},
    });
};

export const mobileRequest = async (request: Request, load: (userId: number) => Promise<unknown>) => {
    try {
        if (!["GET", "HEAD"].includes(request.method)) {
            const origin = request.headers.get("origin");
            if (origin && ![new URL(request.url).origin, new URL(clientEnv.VITE_BASE_URL).origin].includes(origin)) {
                return json({error: {message: "This origin is not allowed."}}, 403);
            }
            if (!request.headers.get("content-type")?.startsWith("application/json")) {
                return json({error: {message: "Send a JSON request body."}}, 415);
            }
        }
        const user = await getRequestUser(request.headers);
        if (!user) {
            return json({error: {message: "Sign in to continue."}}, 401);
        }

        const data = await load(user.id);
        if (data === null) {
            return json({error: {message: "Profile not found."}}, 404);
        }

        return json(data);
    } catch (error) {
        if (error instanceof ZodError) return json({error: {message: error.issues[0].message}}, 400);
        if (error instanceof SyntaxError) return json({error: {message: "Invalid JSON request body."}}, 400);
        if (error instanceof UnauthorizedError)
            return json({error: {message: "You don’t have access to this content."}}, 403);
        if (isNotFound(error)) return json({error: {message: "Not found."}}, 404);
        if (error instanceof InactiveMediaTypeError) return json({error: {message: error.message}}, 409);
        if (error instanceof FormattedError || error instanceof ValidationError)
            return json({error: {message: error.message}}, 400);
        logger.error({err: error, path: new URL(request.url).pathname}, "Mobile API request failed");
        return json({error: {message: "We couldn’t load your data. Please try again."}}, 500);
    }
};
