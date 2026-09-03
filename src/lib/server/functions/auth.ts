import {serverEnv} from "@/env/server";
import {auth} from "@/lib/server/core/auth";
import {createServerFn} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {getContainer} from "@/lib/server/core/container";
import {getGlobalCapabilities, toActor} from "@/lib/server/authorization";
import {ApiProviderType, PrivacyType, RatingSystemType, RoleType} from "@/lib/utils/enums";


export const getAuthMethods = createServerFn({ method: "GET" })
    .handler(() => ({
        email: !!(serverEnv.ADMIN_MAIL_USERNAME && serverEnv.ADMIN_MAIL_PASSWORD),
        github: !!(serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET),
        google: !!(serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET),
    }));


export const getCurrentUser = createServerFn({ method: "GET" })
    .handler(async () => {
        const { headers } = getRequest();
        const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });

        if (!session?.user) {
            return null;
        }

        const accountService = await getContainer().then((c) => c.services.account);

        const userId = Number(session.user.id);
        const actor = toActor({ id: userId, role: session.user.role });
        const settings = await accountService.getMinimalUserSettings(userId);

        return {
            ...session.user,
            settings,
            id: userId,
            role: session.user.role as RoleType,
            capabilities: getGlobalCapabilities(actor),
            privacy: session.user.privacy as PrivacyType,
            ratingSystem: session.user.ratingSystem as RatingSystemType,
            searchSelector: session.user.searchSelector as ApiProviderType,
        };
    });
