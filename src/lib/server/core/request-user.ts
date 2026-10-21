import {auth} from "@/lib/server/core/auth";
import {logger} from "@/lib/server/core/logger";
import {getContainer} from "@/lib/server/core/container";


export const getRequestUser = async (headers: Headers) => {
    const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
    const currentUser = session?.user ? { ...session.user, id: Number(session.user.id) } : undefined;

    if (currentUser) {
        void getContainer()
            .then((c) => c.services.account.updateUserLastSeen(c.cacheManager, currentUser.id))
            .catch((err) => logger.warn({ err, userId: currentUser.id }, "Failed to update user last seen"));
    }

    return currentUser;
};
