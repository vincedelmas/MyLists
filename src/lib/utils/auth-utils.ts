import {USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH} from "@/lib/schemas/common.schema";


export const AuthState = {
    ANONYMOUS: "anonymous",
    AUTHENTICATED: "authenticated",
    AWAITING_EMAIL_VERIFICATION: "awaiting-email-verification",
} as const;
export type AuthState = typeof AuthState[keyof typeof AuthState];


export const getAuthState = (currentUser: object | null | undefined, awaitingEmailVerification = false) => {
    if (currentUser) return AuthState.AUTHENTICATED;
    return awaitingEmailVerification ? AuthState.AWAITING_EMAIL_VERIFICATION : AuthState.ANONYMOUS;
};


export const isAuthenticatedAuthState = (state: AuthState) => {
    return state === AuthState.AUTHENTICATED;
};


export const checkOAuthUsername = (profileName: string) => {
    const username = profileName
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/[-_]{2,}/g, "-")
        .replace(/^[-_]+|[-_]+$/g, "")
        .slice(0, USERNAME_MAX_LENGTH)
        .replace(/[-_]+$/g, "");

    return username.length >= USERNAME_MIN_LENGTH
        ? username
        : undefined;
};


export const addUsernameSuffix = (username: string, suffix: string) => {
    const baseMaxLength = USERNAME_MAX_LENGTH - suffix.length - 1;
    const base = username.slice(0, baseMaxLength).replace(/[-_]+$/g, "");

    return `${base}-${suffix}`;
};


export const hasGeneratedUsernameSuffix = (username: string) => {
    return /-[0-9a-f]{6}$/.test(username);
}


export const isVerificationError = (error?: string) => {
    return !!error && ["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND"].includes(error);
}


export const getOAuthErrorMessage = (error?: string) => {
    if (!error || isVerificationError(error)) return undefined;

    if (error === "access_denied") {
        return "Social sign-in was cancelled or denied by the provider.";
    }

    if (error === "email_not_found") {
        return "Your social provider did not return an email address. Try another sign-in method.";
    }

    if (error === "email_not_verified") {
        return "Your social provider has not verified your email address yet.";
    }

    if (["account_already_linked_to_different_user", "email_does_not_match", "unable_to_link_account"].includes(error)) {
        return "That social account is already connected to a different MyLists account.";
    }

    return "We couldn’t complete social sign-in. Please try again.";
};


export const getSafeRedirectPath = (value: unknown, baseURL: string) => {
    if (typeof value !== "string" || !value.trim()) return undefined;

    try {
        const base = new URL(baseURL);
        const url = new URL(value, base);
        if (url.origin !== base.origin) return undefined;

        const path = `${url.pathname}${url.search}${url.hash}`;
        return path.startsWith("/") && !path.startsWith("//") ? path : undefined;
    }
    catch {
        return undefined;
    }
};
