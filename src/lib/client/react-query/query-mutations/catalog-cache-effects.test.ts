import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {catalogMutationInvalidationKeys} from "./catalog-cache-effects";


const serialized = (effect: "cover" | "edit" | "refresh", kind: MediaType, mediaId = 42) =>
    catalogMutationInvalidationKeys(effect, kind, mediaId).map((key) => JSON.stringify(key));


describe("catalog mutation cache effects", () => {
    it("keeps a cover contribution to presentation consumers", () => {
        const keys = serialized("cover", MediaType.BOOKS);
        expect(keys).toContain(JSON.stringify(["details", MediaType.BOOKS, 42]));
        expect(keys).toContain(JSON.stringify(["userList", MediaType.BOOKS]));
        expect(keys).not.toContain(JSON.stringify(["userStats"]));
        expect(keys).not.toContain(JSON.stringify(["gameCompatiblePlatforms", 42]));
    });

    it("invalidates metadata, list, job, upcoming and reconciliation consumers after an edit", () => {
        const keys = serialized("edit", MediaType.MOVIES);
        expect(keys).toEqual(expect.arrayContaining([
            JSON.stringify(["editDetails", MediaType.MOVIES, 42]),
            JSON.stringify(["jobDetails", MediaType.MOVIES]),
            JSON.stringify(["userStats"]),
            JSON.stringify(["upcoming"]),
        ]));
        expect(keys).not.toContain(JSON.stringify(["gameCompatiblePlatforms", 42]));
    });

    it("refreshes compatible platforms only for games", () => {
        expect(serialized("refresh", MediaType.GAMES))
            .toContain(JSON.stringify(["gameCompatiblePlatforms", 42]));
        expect(serialized("refresh", MediaType.BOOKS))
            .not.toContain(JSON.stringify(["gameCompatiblePlatforms", 42]));
    });
});
