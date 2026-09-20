import {beforeEach, describe, expect, it, vi} from "vitest";
import type {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {createOpenLibraryBookEnricher} from "./open-library-books.enricher";

const mocks = vi.hoisted(() => ({ call: vi.fn(), warn: vi.fn() }));
vi.mock("@/env/server", () => ({ serverEnv: { OPEN_LIBRARY_CONTACT_EMAIL: "catalogue@example.com" } }));
vi.mock("@/lib/server/api-providers/api/http.base", () => ({ createApiHttpClient: () => Promise.resolve({ call: mocks.call }) }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { warn: mocks.warn } }));

describe("optional Open Library work matching", () => {
    const details: UpsertBooksWithDetails = {
        mediaData: { apiId: "google-volume", name: "Un livre", imageCover: "book.jpg" },
        editionData: { apiId: "google-volume", name: "Un livre", imageCover: "book.jpg", isbns: ["9780140328721"], authors: ["An Author"] },
    };
    const context = { mode: "store" as const };
    const work = { key: "/works/OL123W", title: "A Book", author_name: ["An Author"], first_publish_year: 1988 };
    const cache = new Map<string, unknown>();
    const enrich = createOpenLibraryBookEnricher({ wrap: async <T>(key: string, lookup: () => Promise<T>) => {
        if (cache.has(key)) return cache.get(key) as T;
        const value = await lookup(); cache.set(key, value); return value;
    } });
    beforeEach(() => { vi.clearAllMocks(); cache.clear(); });

    it("adds compatible work evidence and caches by ISBN while preserving Google volume details", async () => {
        mocks.call.mockResolvedValue(Response.json({ docs: [work] }));
        expect(await enrich(details, context)).toMatchObject({
            mediaData: { apiId: "google-volume", name: "Un livre", releaseDate: "1988-01-01" },
            editionData: { apiId: "google-volume", openLibraryWorkId: "/works/OL123W" },
        });
        await enrich(details, context);
        expect(mocks.call).toHaveBeenCalledOnce();
        expect(mocks.call.mock.calls[0][0]).toContain("isbn=9780140328721");
    });

    it.each([[], [work, {...work, key: "/works/OL999W"}], [{...work, author_name: ["Different Author"]}], [{...work, key: "/books/OL123M"}]])
    ("leaves missing, ambiguous or incompatible results ungrouped: %j", async (...docs) => {
        mocks.call.mockResolvedValue(Response.json({ docs }));
        expect(await enrich(details, context)).toEqual(details);
    });

    it("continues with Google Books when the optional lookup fails", async () => {
        mocks.call.mockRejectedValue(new Error("Unavailable"));
        expect(await enrich(details, context)).toEqual(details);
        expect(mocks.warn).toHaveBeenCalledOnce();
    });

    it("does not request lookups for bulk imports or volumes without ISBNs", async () => {
        await enrich(details, {...context, isBulk: true});
        await enrich({...details, editionData: {...details.editionData, isbns: []}}, context);
        expect(mocks.call).not.toHaveBeenCalled();
    });
});
