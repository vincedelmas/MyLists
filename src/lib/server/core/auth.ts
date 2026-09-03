import bcrypt from "bcrypt";
import crypto from "crypto";
import {eq} from "drizzle-orm";
import {clientEnv} from "@/env/client";
import {serverEnv} from "@/env/server";
import {db} from "@/lib/server/database/db";
import {betterAuth} from "better-auth/minimal";
import {logger} from "@/lib/server/core/logger";
import {sendEmail} from "@/lib/utils/mail-sender";
import {statusUtils} from "@/lib/utils/media-mapping";
import {clearAdminCookie} from "@/lib/utils/admin-utils";
import {createServerOnlyFn} from "@tanstack/react-start";
import {usernameSchema} from "@/lib/schemas/common.schema";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {APIError, createAuthMiddleware} from "better-auth/api";
import {getDbClient} from "@/lib/server/database/async-storage";
import {tanstackStartCookies} from "better-auth/tanstack-start";
import {hashPassword, verifyPassword} from "better-auth/crypto";
import {addUsernameSuffix, checkOAuthUsername} from "@/lib/utils/auth-utils";
import {user as userTable, userMediaSettings} from "@/lib/server/database/schema";
import {ApiProviderType, MediaType, PrivacyType, RatingSystemType, RoleType, Status} from "@/lib/utils/enums";


const mailEnabled = !!(serverEnv.ADMIN_MAIL_USERNAME && serverEnv.ADMIN_MAIL_PASSWORD);
const githubOAuthConfig = serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET
    ? { clientId: serverEnv.GITHUB_CLIENT_ID, clientSecret: serverEnv.GITHUB_CLIENT_SECRET }
    : null;

const googleOAuthConfig = serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET
    ? { clientId: serverEnv.GOOGLE_CLIENT_ID, clientSecret: serverEnv.GOOGLE_CLIENT_SECRET }
    : null;


const deliverAuthEmail = (message: Parameters<typeof sendEmail>[0]) => {
    void sendEmail(message)
        .catch((err) => logger.error({ err, template: message.template }, "Failed to send authentication email"));
};


const getAuthConfig = createServerOnlyFn(() => betterAuth({
    appName: "MyLists",
    baseURL: clientEnv.VITE_BASE_URL,
    secret: serverEnv.BETTER_AUTH_SECRET,
    telemetry: {
        enabled: false,
    },
    onAPIError: {
        errorURL: new URL("/login", clientEnv.VITE_BASE_URL).toString(),
    },
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    rateLimit: {
        customRules: {
            "/send-verification-email": { max: 3, window: 5 * 60 },
        },
    },
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            if (ctx.path === "/sign-out") {
                clearAdminCookie();
            }
        }),
    },
    databaseHooks: {
        // MyLists does not use provider ID tokens after the OAuth callback.
        account: {
            create: {
                before: async (account) => ({ data: { ...account, idToken: null } }),
            },
            update: {
                before: async (account) => ({ data: { ...account, idToken: null } }),
            },
        },
        user: {
            create: {
                before: async (user, context) => {
                    if (context?.path?.startsWith("/callback/")) {
                        const baseUsername = checkOAuthUsername(user.name);
                        let username = baseUsername
                            ?? addUsernameSuffix("user", crypto.randomBytes(3).toString("hex"));

                        let usernameExists = getDbClient()
                            .select({ id: userTable.id })
                            .from(userTable)
                            .where(eq(userTable.name, username))
                            .get();

                        while (usernameExists) {
                            username = addUsernameSuffix(baseUsername ?? "user", crypto.randomBytes(3).toString("hex"));
                            usernameExists = getDbClient()
                                .select({ id: userTable.id })
                                .from(userTable)
                                .where(eq(userTable.name, username))
                                .get();
                        }

                        return {
                            data: {
                                ...user,
                                name: username,
                            },
                        };
                    }

                    const parsedUsername = usernameSchema.safeParse(user.name);
                    if (!parsedUsername.success) {
                        throw new APIError("BAD_REQUEST", {
                            code: "INVALID_USERNAME",
                            message: parsedUsername.error.issues[0].message,
                        });
                    }

                    const usernameExist = getDbClient()
                        .select()
                        .from(userTable)
                        .where(eq(userTable.name, parsedUsername.data))
                        .get();

                    if (usernameExist) {
                        throw new APIError("BAD_REQUEST", {
                            code: "USERNAME_TAKEN",
                            message: "This username is already taken. Please choose another one.",
                        });
                    }

                    return {
                        data: {
                            ...user,
                            name: parsedUsername.data,
                        },
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

                    await getDbClient()
                        .insert(userMediaSettings)
                        .values(userMediaSettingsData)
                        .onConflictDoNothing();
                },
            }
        },
    },
    user: {
        additionalFields: {
            profileViews: {
                input: false,
                type: "number",
                returned: true,
                defaultValue: 0,
            },
            backgroundImage: {
                input: false,
                type: "string",
                returned: true,
                defaultValue: "default.jpg",
            },
            role: {
                input: false,
                type: "string",
                returned: true,
                defaultValue: RoleType.USER,
            },
            showUpdateModal: {
                input: false,
                returned: true,
                type: "boolean",
                defaultValue: true,
            },
            gridListView: {
                input: false,
                returned: true,
                type: "boolean",
                defaultValue: true,
            },
            autoMoveCompletedTvToOnHold: {
                input: false,
                returned: true,
                type: "boolean",
                defaultValue: true,
            },
            privacy: {
                input: false,
                type: "string",
                returned: true,
                defaultValue: PrivacyType.RESTRICTED,
            },
            searchSelector: {
                input: false,
                type: "string",
                returned: true,
                defaultValue: ApiProviderType.TMDB,
            },
            ratingSystem: {
                input: false,
                type: "string",
                returned: true,
                defaultValue: RatingSystemType.SCORE,
            },
            showOnboarding: {
                input: false,
                returned: true,
                type: "boolean",
                defaultValue: true,
            },
        },
        changeEmail: {
            enabled: mailEnabled,
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },
    account: {
        encryptOAuthTokens: true,
    },
    socialProviders: {
        ...(githubOAuthConfig ? { github: githubOAuthConfig } : {}),
        ...(googleOAuthConfig ? { google: googleOAuthConfig } : {}),
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        disableSignUp: !mailEnabled,
        resetPasswordTokenExpiresIn: 3600,
        revokeSessionsOnPasswordReset: true,
        requireEmailVerification: mailEnabled,
        ...(mailEnabled ? {
            sendResetPassword: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
                deliverAuthEmail({
                    link: url,
                    to: user.email,
                    username: user.name,
                    template: "resetPassword",
                    subject: "MyLists - Reset Your Password",
                });
            },
        } : {}),
        password: {
            hash: hashPassword,
            verify: ({ hash, password }) => hash.startsWith("$2")
                ? bcrypt.compare(password, hash)
                : verifyPassword({ hash, password }),
        },
    },
    ...(mailEnabled ? {
        emailVerification: {
            expiresIn: 3600,
            sendOnSignUp: true,
            sendOnSignIn: false,
            autoSignInAfterVerification: true,
            sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
                deliverAuthEmail({
                    link: url,
                    to: user.email,
                    username: user.name,
                    template: "register",
                    subject: "MyLists - Verify your email address",
                });
            },
        },
    } : {}),
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
