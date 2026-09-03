import bcrypt from "bcrypt";
import crypto from "crypto";
import {eq} from "drizzle-orm";
import {clientEnv} from "@/env/client";
import {serverEnv} from "@/env/server";
import {db} from "@/lib/server/database/db";
import {betterAuth} from "better-auth/minimal";
import {sendEmail} from "@/lib/utils/mail-sender";
import {RateLimiterRes} from "rate-limiter-flexible";
import {statusUtils} from "@/lib/utils/media-mapping";
import {createServerOnlyFn} from "@tanstack/react-start";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {APIError, createAuthMiddleware} from "better-auth/api";
import {getDbClient} from "@/lib/server/database/async-storage";
import {tanstackStartCookies} from "better-auth/tanstack-start";
import {hashPassword, verifyPassword} from "better-auth/crypto";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {user as userTable, userMediaSettings} from "@/lib/server/database/schema";
import {ApiProviderType, MediaType, PrivacyType, RatingSystemType, RoleType, Status} from "@/lib/utils/enums";


const mailEnabled = !!(serverEnv.ADMIN_MAIL_USERNAME && serverEnv.ADMIN_MAIL_PASSWORD);
const verificationEmailRateLimiter = mailEnabled
    ? createRateLimiter({ points: 3, duration: 10 * 60, keyPrefix: "auth-verification-email" })
    : null;

const githubOAuthConfig = serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET
    ? { clientId: serverEnv.GITHUB_CLIENT_ID, clientSecret: serverEnv.GITHUB_CLIENT_SECRET }
    : null;

const googleOAuthConfig = serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET
    ? { clientId: serverEnv.GOOGLE_CLIENT_ID, clientSecret: serverEnv.GOOGLE_CLIENT_SECRET }
    : null;


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
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== "/send-verification-email") return;

            const email = (ctx.body as { email?: string } | undefined)?.email;
            if (!email || !verificationEmailRateLimiter) return;

            try {
                await (await verificationEmailRateLimiter).consume(crypto.createHash("sha256")
                    .update(email.trim().toLowerCase())
                    .digest("hex")
                );
            }
            catch (error) {
                if (!(error instanceof RateLimiterRes)) throw error;

                throw new APIError("TOO_MANY_REQUESTS", {
                    message: "Too many verification emails requested. Please try again later.",
                });
            }
        }),
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    const usernameExist = getDbClient()
                        .select()
                        .from(userTable)
                        .where(eq(userTable.name, user.name))
                        .get();

                    if (!usernameExist) {
                        return { data: user };
                    }

                    return {
                        data: {
                            ...user,
                            name: `${user.name}-${crypto.randomBytes(4).toString("hex")}`,
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
            autoMoveCompletedTvToOnHold: {
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
            enabled: mailEnabled,
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
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
        requireEmailVerification: mailEnabled,
        ...(mailEnabled ? {
            sendResetPassword: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
                await sendEmail({
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
                await sendEmail({
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
