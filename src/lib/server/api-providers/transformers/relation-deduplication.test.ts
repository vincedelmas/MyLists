import {MediaType} from "@/lib/utils/enums";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {GBooksDetails, IgdbGameDetails, JikanDetails} from "@/lib/types/provider.types";
import {gBooksTransformer} from "@/lib/server/api-providers/transformers/gbook.transformer";
import {igdbTransformer} from "@/lib/server/api-providers/transformers/igdb.transformer";
import {jikanTransformer} from "@/lib/server/api-providers/transformers/jikan.transformer";


const imageMocks = vi.hoisted(() => ({
    saveImageFromUrl: vi.fn(),
}));


vi.mock("@/lib/utils/image-saver", () => imageMocks);


describe("provider relation deduplication", () => {
    beforeEach(() => {
        imageMocks.saveImageFromUrl.mockReset();
        imageMocks.saveImageFromUrl.mockResolvedValue("covers/default.webp");
    });

    it("deduplicates IGDB companies by the database composite key", async () => {
        const details = {
            id: 11597,
            name: "Poly Bridge",
            first_release_date: 1468281600,
            external_games: [],
            genres: [
                { name: "4X (explore, expand, exploit, and exterminate)" },
                { name: "Puzzle" },
            ],
            themes: [{ name: "4X" }],
            platforms: [
                { name: "PC (Microsoft Windows)" },
                { name: "PC (Microsoft Windows)" },
            ],
            involved_companies: [
                {
                    id: 96611,
                    company: { id: 6111, name: "Dry Cactus" },
                    developer: true,
                    publisher: true,
                },
                {
                    id: 96612,
                    company: { id: 6111, name: "Dry Cactus" },
                    developer: true,
                    publisher: true,
                },
            ],
        } as unknown as IgdbGameDetails;

        const result = await igdbTransformer.transformDetailsResults(details, {
            mediaType: MediaType.GAMES,
            coverDirectory: "games-covers",
            maxGenres: 8,
        });

        expect(result.companiesData).toEqual([
            { name: "Dry Cactus", developer: true, publisher: true },
        ]);
        expect(result.platformsData).toEqual([
            { name: "PC (Microsoft Windows)" },
        ]);
        expect(result.genresData).toEqual([
            { name: "4X" },
            { name: "Puzzle" },
        ]);
    });

    it("deduplicates Jikan authors before applying the author limit", async () => {
        const details = {
            url: "https://myanimelist.net/manga/1",
            mal_id: 1,
            volumes: 1,
            chapters: 1,
            synopsis: "",
            status: "Finished",
            score: 8,
            title: "Manga",
            title_english: "Manga",
            scored_by: 100,
            popularity: 1,
            published: { from: "2020-01-01", to: "2020-12-31" },
            serializations: [],
            images: { jpg: { large_image_url: "https://example.com/manga.jpg" } },
            genres: [
                { name: "Action" },
                { name: "Action" },
                { name: "Comedy" },
            ],
            authors: [
                { name: "Doe, Jane" },
                { name: "Doe, Jane" },
                { name: "Smith, John" },
            ],
        } as unknown as JikanDetails;

        const result = await jikanTransformer.transformDetailsResults(details, {
            mediaType: MediaType.MANGA,
            coverDirectory: "manga-covers",
            maxAuthors: 2,
        });

        expect(result.authorsData).toEqual([
            { name: "Jane Doe" },
            { name: "John Smith" },
        ]);
        expect(result.genresData).toEqual([
            { name: "Action" },
            { name: "Comedy" },
        ]);
    });

    it("deduplicates Google Books authors", async () => {
        const details = {
            id: "book-1",
            volumeInfo: {
                title: "Book",
                language: "en",
                publisher: "Publisher",
                pageCount: 100,
                publishedDate: "2020-01-01",
                description: "",
                imageLinks: {},
                authors: ["Jane Doe", "Jane Doe", "John Smith"],
            },
        } as unknown as GBooksDetails;

        const result = await gBooksTransformer.transformDetailsResults(details, {
            mediaType: MediaType.BOOKS,
            coverDirectory: "books-covers",
            defaultPages: 1,
        });

        expect(result.authorsData).toEqual([
            { name: "Jane Doe" },
            { name: "John Smith" },
        ]);
    });
});
