import {describe, expect, it} from "vitest";
import {bookCatalogDetailsSchema, mediaDetailsPageSchema} from "@/lib/contracts/media/details";
import {MediaType} from "@/lib/utils/enums";


const bookMedia = {
    kind: MediaType.BOOKS,
    id: 1,
    name: "Book",
    releaseDate: null,
    synopsis: null,
    imageCover: "book.jpg",
    lockStatus: false,
    addedAt: null,
    lastApiUpdate: null,
    genres: [],
    providerData: { name: "GoogleBooks", url: "https://books.test/1" },
    apiId: "volume-1",
    pages: 240,
    language: "en",
    publishers: null,
    authors: [],
};


describe("media details contracts", () => {
    it("accepts a coherent family-discriminated details page", () => {
        expect(mediaDetailsPageSchema.safeParse({
            kind: MediaType.BOOKS,
            media: bookMedia,
            userMedia: null,
            followsData: [],
            similarMedia: [],
        }).success).toBe(true);
    });

    it("rejects a nested discriminator that disagrees with the page", () => {
        const result = mediaDetailsPageSchema.safeParse({
            kind: MediaType.BOOKS,
            media: { ...bookMedia, kind: MediaType.GAMES },
            userMedia: null,
            followsData: [],
            similarMedia: [],
        });

        expect(result.success).toBe(false);
    });

    it("rejects catalog fields owned by another family", () => {
        const result = bookCatalogDetailsSchema.safeParse({
            ...bookMedia,
            platforms: [{ id: 1, name: "PC" }],
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: "unrecognized_keys", keys: ["platforms"] }),
        ]));
    });
});
