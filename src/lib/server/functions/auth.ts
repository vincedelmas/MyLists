import {auth} from "@/lib/server/core/auth";
import {createServerFn} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {getContainer} from "@/lib/server/core/container";
import {ApiProviderType, PrivacyType, RatingSystemType, RoleType} from "@/lib/utils/enums";


export const getCurrentUser = createServerFn({ method: "GET" })
    .handler(async () => {
        const { headers } = getRequest();
        const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });

        if (!session?.user) {
            return null;
        }

        const account = await getContainer().then((c) => c.account.query);
        const userId = Number(session.user.id);
        const settings = await account.getMinimalSettings(userId);

        return {
            ...session.user,
            id: userId,
            role: session.user.role as RoleType,
            privacy: session.user.privacy as PrivacyType,
            ratingSystem: session.user.ratingSystem as RatingSystemType,
            searchSelector: session.user.searchSelector as ApiProviderType,
            settings,
        };
    });
