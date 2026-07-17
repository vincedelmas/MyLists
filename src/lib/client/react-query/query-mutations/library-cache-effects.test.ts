import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {libraryMutationInvalidationKeys} from "./library-cache-effects";


const serialized = (input: Parameters<typeof libraryMutationInvalidationKeys>[0]) =>
    libraryMutationInvalidationKeys(input).map((key) => JSON.stringify(key));


describe("library mutation cache effects", () => {
    it("invalidates entry, list, profile, stats, history, activity and upcoming projections after add", () => {
        const keys = serialized({
            effect: "add",
            mediaType: MediaType.BOOKS,
            mediaId: 42,
            viewerName: "reader",
            sourceQueryKey: ["source"],
        });
        expect(keys).toEqual(expect.arrayContaining([
            JSON.stringify(["source"]),
            JSON.stringify(["details", MediaType.BOOKS, 42]),
            JSON.stringify(["userList", MediaType.BOOKS]),
            JSON.stringify(["onOpenHistory", MediaType.BOOKS, 42]),
            JSON.stringify(["profile", "reader"]),
            JSON.stringify(["userStats", "reader"]),
            JSON.stringify(["monthly-activity", "reader"]),
            JSON.stringify(["upcoming"]),
        ]));
        expect(keys).not.toContain(JSON.stringify(["collections"]));
    });

    it("invalidates monthly activity only for activity-producing updates", () => {
        expect(serialized({
            effect: "update", mediaType: MediaType.GAMES, mediaId: 7, viewerName: "player",
        })).not.toContain(JSON.stringify(["monthly-activity", "player"]));
        expect(serialized({
            effect: "update", mediaType: MediaType.GAMES, mediaId: 7, viewerName: "player", recordsActivity: true,
        })).toContain(JSON.stringify(["monthly-activity", "player"]));
    });

    it("keeps custom covers to presentation and tags to tag-owned projections", () => {
        const cover = serialized({ effect: "cover", mediaType: MediaType.MANGA, mediaId: 9 });
        expect(cover).toEqual([
            JSON.stringify(["details", MediaType.MANGA, 9]),
            JSON.stringify(["userList", MediaType.MANGA]),
        ]);
        expect(cover).not.toContain(JSON.stringify(["userStats"]));

        const tag = serialized({ effect: "tag", mediaType: MediaType.MANGA, mediaId: 9, viewerName: "reader" });
        expect(tag).toEqual(expect.arrayContaining([
            JSON.stringify(["tagNames", MediaType.MANGA]),
            JSON.stringify(["tagsView", MediaType.MANGA, "reader"]),
        ]));
        expect(tag).not.toContain(JSON.stringify(["upcoming"]));
    });
});
