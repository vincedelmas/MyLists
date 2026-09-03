import {describe, expect, it} from "vitest";
import {addUsernameSuffix, AuthState, checkOAuthUsername, getAuthState, getOAuthErrorMessage, hasGeneratedUsernameSuffix, isAuthenticatedAuthState, isVerificationError} from "@/lib/utils/auth-utils";


describe("auth state", () => {
    it("models each user-facing authentication state", () => {
        expect(getAuthState(null)).toBe(AuthState.ANONYMOUS);
        expect(getAuthState(null, true)).toBe(AuthState.AWAITING_EMAIL_VERIFICATION);
        expect(getAuthState({})).toBe(AuthState.AUTHENTICATED);
    });

    it("only treats the authenticated state as signed in", () => {
        expect(isAuthenticatedAuthState(AuthState.ANONYMOUS)).toBe(false);
        expect(isAuthenticatedAuthState(AuthState.AWAITING_EMAIL_VERIFICATION)).toBe(false);
        expect(isAuthenticatedAuthState(AuthState.AUTHENTICATED)).toBe(true);
    });
});


describe("OAuth usernames", () => {
    it("normalizes a provider profile name to the username rules", () => {
        expect(checkOAuthUsername("  François Dupont  ")).toBe("francois-dupont");
    });

    it("falls back when no meaningful valid username can be derived", () => {
        expect(checkOAuthUsername("李 雷")).toBeUndefined();
        expect(checkOAuthUsername("__a__")).toBeUndefined();
    });

    it("keeps a collision suffix inside the username limit", () => {
        expect(addUsernameSuffix("a-very-long-profile-name", "a3f9c2")).toBe("a-very-l-a3f9c2");
    });

    it("recognizes usernames that received a generated suffix", () => {
        expect(hasGeneratedUsernameSuffix("francois-a3f9c2")).toBe(true);
        expect(hasGeneratedUsernameSuffix("francois-dupont")).toBe(false);
    });
});


describe("auth error messages", () => {
    it("keeps email verification errors out of OAuth feedback", () => {
        expect(isVerificationError("TOKEN_EXPIRED")).toBe(true);
        expect(getOAuthErrorMessage("TOKEN_EXPIRED")).toBeUndefined();
    });

    it("explains provider cancellation", () => {
        expect(getOAuthErrorMessage("access_denied")).toContain("cancelled");
    });

    it("uses safe generic feedback for unknown OAuth errors", () => {
        expect(getOAuthErrorMessage("provider_specific_failure")).toBe("We couldn’t complete social sign-in. Please try again.");
    });
});
