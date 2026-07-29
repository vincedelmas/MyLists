import {MediaType} from "@/lib/utils/enums";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {GBooksDetails, IgdbGameDetails, MalMangaDetails} from "@/lib/types/provider.types";
import {gBooksTransformer} from "@/lib/server/api-providers/transformers/gbook.transformer";
import {igdbTransformer} from "@/lib/server/api-providers/transformers/igdb.transformer";
import {malTransformer} from "@/lib/server/api-providers/transformers/mal.transformer";


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

    it("deduplicates MyAnimeList authors before applying the author limit", async () => {
        const details = {
            id: 1,
            num_volumes: 1,
            num_chapters: 1,
            synopsis: "",
            status: "finished",
            mean: 8,
            title: "Manga",
            alternative_titles: { en: "Manga" },
            num_scoring_users: 100,
            popularity: 1,
            start_date: "2020-01-01",
            end_date: "2020-12-31",
            serialization: [],
            main_picture: { medium: "https://example.com/manga.jpg" },
            genres: [
                { id: 1, name: "Action" },
                { id: 1, name: "Action" },
                { id: 4, name: "Comedy" },
            ],
            authors: [
                { node: { id: 1, first_name: "Jane", last_name: "Doe" }, role: "Story" },
                { node: { id: 1, first_name: "Jane", last_name: "Doe" }, role: "Art" },
                { node: { id: 2, first_name: "John", last_name: "Smith" }, role: "Story" },
            ],
        } as MalMangaDetails;

        const result = await malTransformer.transformDetailsResults(details, {
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
