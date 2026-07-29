import {MediaType} from "@/lib/utils/enums";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MalMangaDetails, MalMangaSearchResponse} from "@/lib/types/provider.types";
import {malTransformer} from "@/lib/server/api-providers/transformers/mal.transformer";


const imageMocks = vi.hoisted(() => ({
    saveImageFromUrl: vi.fn(),
}));


vi.mock("@/lib/utils/image-saver", () => imageMocks);


const transformOptions = {
    mediaType: MediaType.MANGA,
    coverDirectory: "manga-covers" as const,
    maxAuthors: 2,
};


describe("malTransformer", () => {
    beforeEach(() => {
        imageMocks.saveImageFromUrl.mockReset();
        imageMocks.saveImageFromUrl.mockResolvedValue("manga-cover.jpg");
    });

    it("maps MAL search nodes and next-page links to the provider contract", () => {
        const response: MalMangaSearchResponse = {
            data: [{
                node: {
                    id: 2,
                    title: "Berserk",
                    alternative_titles: { en: "Berserk" },
                    start_date: "1989-08-25",
                    main_picture: {
                        medium: "https://example.com/berserk.jpg",
                    },
                },
            }],
            paging: {
                next: "https://api.myanimelist.net/v2/manga?offset=20",
            },
        };

        expect(malTransformer.transformSearchResults({
            page: 1,
            resultsPerPage: 20,
            rawData: response,
        }, transformOptions)).toEqual({
            hasNextPage: true,
            data: [{
                id: 2,
                name: "Berserk",
                date: "1989-08-25",
                image: "https://example.com/berserk.jpg",
                itemType: MediaType.MANGA,
            }],
        });
    });

    it("normalizes MAL detail fields for the existing manga schema", async () => {
        const details: MalMangaDetails = {
            id: 2,
            title: "Berserk",
            alternative_titles: { en: "Berserk" },
            start_date: "1989-08-25",
            end_date: null,
            synopsis: "A dark fantasy.",
            mean: 9.3,
            popularity: 1,
            num_scoring_users: 89416,
            status: "currently_publishing",
            genres: [
                { id: 1, name: "Action" },
                { id: 41, name: "Seinen" },
            ],
            num_volumes: 0,
            num_chapters: 0,
            authors: [{
                node: { id: 1868, first_name: "Kentarou", last_name: "Miura" },
                role: "Story & Art",
            }],
            serialization: [{
                node: { id: 2, name: "Young Animal" },
                role: "Serialization",
            }],
            main_picture: {
                medium: "https://example.com/berserk-medium.jpg",
                large: "https://example.com/berserk-large.jpg",
            },
        };

        const result = await malTransformer.transformDetailsResults(details, transformOptions);

        expect(result.mediaData).toMatchObject({
            apiId: 2,
            name: "Berserk",
            originalName: "Berserk",
            siteUrl: "https://myanimelist.net/manga/2",
            volumes: null,
            chapters: null,
            prodStatus: "Publishing",
            releaseDate: "1989-08-25",
            endDate: null,
            voteAverage: 9.3,
            voteCount: 89416,
            popularity: 1,
            publishers: "Young Animal",
            imageCover: "manga-cover.jpg",
        });
        expect(result.authorsData).toEqual([{ name: "Kentarou Miura" }]);
        expect(result.genresData).toEqual([{ name: "Action" }, { name: "Seinen" }]);
        expect(imageMocks.saveImageFromUrl).toHaveBeenCalledWith({
            dirSaveName: "manga-covers",
            imageUrl: "https://example.com/berserk-large.jpg",
        });
    });
});
