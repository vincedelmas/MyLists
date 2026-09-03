import {describe, expect, it} from "vitest";
import {getSafeRedirectPath} from "@/lib/utils/redirects";


describe("getSafeRedirectPath", () => {
    const baseURL = "https://mylists.example";

    it("preserves internal paths from relative and same-origin URLs", () => {
        expect(getSafeRedirectPath("/settings/profile?tab=account#email", baseURL))
            .toBe("/settings/profile?tab=account#email");
        expect(getSafeRedirectPath("https://mylists.example/collections/7/edit", baseURL))
            .toBe("/collections/7/edit");
    });

    it("rejects external, empty, and malformed URLs", () => {
        expect(getSafeRedirectPath("https://example.com/settings", baseURL)).toBeUndefined();
        expect(getSafeRedirectPath("//example.com/settings", baseURL)).toBeUndefined();
        expect(getSafeRedirectPath("", baseURL)).toBeUndefined();
        expect(getSafeRedirectPath("https://%", baseURL)).toBeUndefined();
    });
});
