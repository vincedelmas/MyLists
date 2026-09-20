import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import type {CacheManager} from "@/lib/server/core/cache-manager";
import {normalizeBookName} from "@/lib/server/domain/media/books/book-matching";
import {createApiHttpClient} from "@/lib/server/api-providers/api/http.base";
import type {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import type {IngestionContext} from "@/lib/server/api-providers/interfaces.types";


type OpenLibraryWork = { key: string; title: string; author_name?: string[]; first_publish_year?: number };

export const createOpenLibraryBookEnricher = (cache: Pick<CacheManager, "wrap">) => {
    const client = createApiHttpClient({
        consumeKey: "openLibrary-API",
        throttleOptions: [{ points: 1, duration: 1, keyPrefix: "openLibraryAPI" }],
    });

    return async (details: UpsertBooksWithDetails, context: IngestionContext) => {
        const isbn = details.editionData.isbns?.[0];
        if (!isbn || context.isBulk) return details;
        try {
            const work = await cache.wrap(`book-work-isbn:${isbn}`, async () => {
                const params = new URLSearchParams({ isbn, fields: "key,title,author_name,first_publish_year", limit: "2" });
                const response = await (await client).call(`https://openlibrary.org/search.json?${params}`, "get", {
                    headers: { "User-Agent": `MyLists${serverEnv.OPEN_LIBRARY_CONTACT_EMAIL ? ` (${serverEnv.OPEN_LIBRARY_CONTACT_EMAIL})` : ""}` },
                    signal: AbortSignal.timeout(10_000),
                });
                const result = await response.json() as { docs: OpenLibraryWork[] };
                return result.docs.length === 1 ? result.docs[0] : null;
            }, { ttl: 30 * 24 * 60 * 60 * 1000 });

            const authors = new Set((details.editionData.authors ?? []).map(normalizeBookName));
            if (!work || !/^\/works\/OL\d+W$/.test(work.key)
                || !work.author_name?.some(author => authors.has(normalizeBookName(author)))) return details;

            const publicationDate = work.first_publish_year && work.first_publish_year > 0 && work.first_publish_year < 10000
                ? `${String(work.first_publish_year).padStart(4, "0")}-01-01` : null;
            return {
                ...details,
                editionData: { ...details.editionData, openLibraryWorkId: work.key },
                mediaData: {
                    ...details.mediaData,
                    ...(publicationDate ? { releaseDate: publicationDate, releaseDateSource: "openLibrary" as const } : {}),
                },
            };
        }
        catch (error) {
            logger.warn({ err: error, isbn }, "Optional book work lookup unavailable");
            return details;
        }
    };
};
