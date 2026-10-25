import {createServerFn} from "@tanstack/react-start";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {getTrendsMediaData} from "@/lib/server/domain/media/trends";

export const getTrendsMedia = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async () => getTrendsMediaData());
