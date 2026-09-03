import {describe, expect, it} from "vitest";
import {getOAuthErrorMessage, isVerificationError} from "@/lib/utils/auth-utils";


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
