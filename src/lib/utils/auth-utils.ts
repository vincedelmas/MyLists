const verificationErrors = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND"]);


export const isVerificationError = (error?: string) => {
    return !!error && verificationErrors.has(error);
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