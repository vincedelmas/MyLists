import {logger} from "@/lib/server/core/logger";
import {getRequestUser} from "@/lib/server/core/request-user";


const json = (data: unknown, status = 200) => {
    return Response.json(data, {
        status,
        headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
}


export const mobileRequest = async (request: Request, load: (userId: number) => Promise<unknown>) => {
    try {
        const user = await getRequestUser(request.headers);
        if (!user) {
            return json({ error: { message: "Sign in to continue." } }, 401);
        }

        const data = await load(user.id);
        if (data === null) {
            return json({ error: { message: "Profile not found." } }, 404);
        }

        return json(data);
    }
    catch (error) {
        logger.error({ err: error, path: new URL(request.url).pathname }, "Mobile API request failed");
        return json({ error: { message: "We couldn’t load your data. Please try again." } }, 500);
    }
};
