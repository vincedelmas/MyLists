import {describe, expect, it} from "vitest";
import {Status} from "@/lib/utils/enums";
import {mediaListSearchSchema} from "./media-lists.schema";


describe("tracking-list metadata search parameters", () => {
    it("preserves unbounded selections and existing catalog values", () => {
        const actors = Array.from({ length: 21 }, (_, index) => `Actor ${index}`);
        actors.push("  Actor with whitespace  ");

        expect(mediaListSearchSchema.parse({ actors, langs: ["en"], platforms: ["PC"] }))
            .toMatchObject({ actors, langs: ["en"], platforms: ["PC"] });
    });

    it("ignores malformed metadata independently without dropping other filters", () => {
        expect(mediaListSearchSchema.parse({
            actors: "Actor", authors: ["Author", 1], platforms: ["Unknown platform"],
            directors: ["Director"], genres: ["Drama"], view: "list", filtersTab: "tags",
        })).toMatchObject({
            actors: undefined, authors: undefined, platforms: undefined,
            directors: ["Director"], genres: ["Drama"], view: "list", filtersTab: "tags",
        });
    });

    it("preserves forgiving tracking URLs independently of strict browsing filters", () => {
        const genres = Array.from({ length: 21 }, (_, index) => `  Genre ${index}  `);

        expect(mediaListSearchSchema.parse({
            genres, tags: ["  Tag  "], search: 1, status: [Status.COMPLETED],
            favorite: "false", comment: "", minRating: 8,
        })).toEqual({
            genres, tags: ["  Tag  "], search: undefined, status: [Status.COMPLETED],
            favorite: true, comment: false,
        });
    });
});
