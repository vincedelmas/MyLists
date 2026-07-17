import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {catalogEditFieldsSchema, catalogEditRequestSchema} from "@/lib/contracts/media/catalog-edit";


describe("catalogEditRequestSchema", () => {
    it("coerces form primitives at the contract boundary", () => {
        expect(catalogEditRequestSchema.parse({
            mediaType: MediaType.MOVIES,
            mediaId: "42",
            payload: { duration: "120", budget: "", lockStatus: "false" },
        })).toEqual({
            mediaType: MediaType.MOVIES,
            mediaId: 42,
            payload: { duration: 120, budget: null, lockStatus: false },
        });
    });

    it("rejects fields belonging to another family", () => {
        const result = catalogEditRequestSchema.safeParse({
            mediaType: MediaType.BOOKS,
            mediaId: 42,
            payload: { currentChapter: 12 },
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid structured relations", () => {
        const result = catalogEditRequestSchema.safeParse({
            mediaType: MediaType.MANGA,
            mediaId: 42,
            payload: { genres: [{ label: "Drama" }] },
        });
        expect(result.success).toBe(false);
    });

    it("keeps book authors and manga genres as structured relations", () => {
        expect(catalogEditRequestSchema.parse({
            mediaType: MediaType.BOOKS,
            mediaId: 42,
            payload: { authors: [{ name: "Octavia Butler" }] },
        }).payload).toEqual({ authors: [{ name: "Octavia Butler" }] });
        expect(catalogEditRequestSchema.parse({
            mediaType: MediaType.MANGA,
            mediaId: 43,
            payload: { genres: [{ name: "Drama" }] },
        }).payload).toEqual({ genres: [{ name: "Drama" }] });
    });

    it("requires a family discriminator on editable fields", () => {
        expect(catalogEditFieldsSchema.safeParse({
            fields: {
                name: "Example",
                releaseDate: null,
                synopsis: null,
                lockStatus: false,
            },
        }).success).toBe(false);
    });
});
