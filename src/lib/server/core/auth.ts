import bcrypt from "bcrypt";
import crypto from "crypto";
import {eq} from "drizzle-orm";
import {clientEnv} from "@/env/client";
import {serverEnv} from "@/env/server";
import {db} from "@/lib/server/database/db";
import {betterAuth} from "better-auth/minimal";
import {sendEmail} from "@/lib/utils/mail-sender";
import {statusUtils} from "@/lib/utils/media-mapping";
import {createServerOnlyFn} from "@tanstack/react-start";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {getDbClient} from "@/lib/server/database/async-storage";
import {tanstackStartCookies} from "better-auth/tanstack-start";
import {libraryStats, profileMediaChannel, user as userTable} from "@/lib/server/database/schema";
import {ApiProviderType, MediaType, PrivacyType, RatingSystemType, RoleType, Status} from "@/lib/utils/enums";


const getAuthConfig = createServerOnlyFn(() => betterAuth({
    appName: "MyLists",
    baseURL: clientEnv.VITE_BASE_URL,
    secret: serverEnv.BETTER_AUTH_SECRET,
    telemetry: {
        enabled: false,
    },
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    const normalizedName = user.name.trim();
                    const usernameExist = getDbClient()
                        .select()
                        .from(userTable)
                        .where(eq(userTable.name, normalizedName))
                        .get();

                    if (!usernameExist) {
                        return { data: { ...user, name: normalizedName } };
                    }

                    return {
                        data: {
                            ...user,
                            name: `${normalizedName}-${crypto.randomBytes(4).toString("hex")}`,
                        }
                    };
                },
                after: async (user) => {
                    const mediaTypes = Object.values(MediaType);
                    const userMediaSettingsData = mediaTypes.map((mt) => ({
                        mediaType: mt,
                        userId: Number(user.id),
                        active: (mt === MediaType.MOVIES || mt === MediaType.SERIES),
                        statusCounts: Object.fromEntries(
                            statusUtils.byMediaType(mt).map((status) => [status, 0])
                        ) as Record<Status, number>,
                    }));

                    await getDbClient().insert(profileMediaChannel).values(userMediaSettingsData.map((setting) => ({
                        userId: setting.userId,
                        kind: setting.mediaType,
                        enabled: setting.active,
                    }))).onConflictDoNothing();

                    await getDbClient().insert(libraryStats).values(userMediaSettingsData.map((setting) => ({
                        userId: setting.userId,
                        kind: setting.mediaType,
                        statusCounts: setting.statusCounts,
                    }))).onConflictDoNothing();
                },
            }
        },
    },
    user: {
        additionalFields: {
            profileViews: {
                type: "number",
                defaultValue: 0,
                returned: true,
                input: false,
            },
            backgroundImage: {
                type: "string",
                defaultValue: "default.jpg",
                returned: true,
                input: false,
            },
            role: {
                type: "string",
                defaultValue: RoleType.USER,
                returned: true,
                input: false,
            },
            showUpdateModal: {
                type: "boolean",
                defaultValue: true,
                returned: true,
                input: false,
            },
            gridListView: {
                type: "boolean",
                defaultValue: true,
                returned: true,
                input: false,
            },
            privacy: {
                type: "string",
                defaultValue: PrivacyType.RESTRICTED,
                returned: true,
                input: false,
            },
            searchSelector: {
                type: "string",
                defaultValue: ApiProviderType.TMDB,
                returned: true,
                input: false,
            },
            ratingSystem: {
                type: "string",
                defaultValue: RatingSystemType.SCORE,
                returned: true,
                input: false,
            },
            showOnboarding: {
                type: "boolean",
                defaultValue: true,
                returned: true,
                input: false,
            },
        },
        changeEmail: {
            enabled: true,
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },
    socialProviders: {
        github: {
            clientId: serverEnv.GITHUB_CLIENT_ID,
            clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
        },
        google: {
            clientId: serverEnv.GOOGLE_CLIENT_ID,
            clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
        },
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        requireEmailVerification: true,
        resetPasswordTokenExpiresIn: 3600,
        sendResetPassword: async ({ user, url }) => {
            await sendEmail({
                link: url,
                to: user.email,
                username: user.name,
                template: "resetPassword",
                subject: "MyLists - Reset Your Password",
            });
        },
        password: {
            hash: async (password: string) => bcrypt.hash(password, 12),
            verify: async ({ hash, password }) => bcrypt.compare(password, Buffer.from(hash).toString()),
        },
    },
    emailVerification: {
        expiresIn: 3600,
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            void sendEmail({
                link: url,
                to: user.email,
                username: user.name,
                template: "register",
                subject: "MyLists - Verify your email address",
            });
        },
    },
    advanced: {
        cookiePrefix: "mylists",
        database: {
            generateId: false,
        },
    },
    plugins: [
        tanstackStartCookies(),
    ]
}));


export const auth = getAuthConfig();
