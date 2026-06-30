import {auth} from "@/lib/server/core/auth";
import {createServerFn} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {getContainer} from "@/lib/server/core/container";
import {usernameAvailabilitySchema} from "@/lib/schemas";
import {ApiProviderType, PrivacyType, RatingSystemType, RoleType} from "@/lib/utils/enums";


export const getUsernameAvailability = createServerFn({ method: "GET" })
    .validator(usernameAvailabilitySchema)
    .handler(async ({ data: { username } }) => {
        const userService = await getContainer().then((c) => c.services.user);
        const available = await userService.isUsernameAvailable(username);
        return { available };
    });


export const getCurrentUser = createServerFn({ method: "GET" })
    .handler(async () => {
        const { headers } = getRequest();
        const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });

        if (!session?.user) {
            return null;
        }

        const userService = await getContainer().then((c) => c.services.user);
        const userId = Number(session.user.id);
        const settings = await userService.getMinimalUserSettings(userId);

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
