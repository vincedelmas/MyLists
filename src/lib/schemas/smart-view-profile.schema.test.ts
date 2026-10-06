import {describe, expect, it} from "vitest";
import {MAX_PROFILE_SMART_VIEWS, profileSmartViewSelectionSchema} from "./smart-view-profile.schema";


describe("profile smart list selection", () => {
    it("uses the configured selection limit, requires unique positive IDs, and rejects forged owners", () => {
        const ids = Array.from({ length: MAX_PROFILE_SMART_VIEWS }, (_, index) => index + 1);
        expect(profileSmartViewSelectionSchema.parse({ ids: [] })).toEqual({ ids: [] });
        expect(profileSmartViewSelectionSchema.parse({ ids })).toEqual({ ids });

        for (const data of [
            { ids: [...ids, MAX_PROFILE_SMART_VIEWS + 1] },
            { ids: [1, 1] },
            { ids: [0] },
            { ids: [1.5] },
            { ids: [1], userId: 2 },
        ]) {
            expect(profileSmartViewSelectionSchema.safeParse(data).success).toBe(false);
        }
    });
});
