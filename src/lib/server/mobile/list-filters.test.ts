import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileListFilterOptions, searchMobileListFilterOptions} from "./list-filters";
import {listInputSchema, getMobileList} from "./media";


const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    options: vi.fn(),
    search: vi.fn(),
    list: vi.fn()
}));


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: { account: { getUserById: mocks.user } },
        registries: {
            mediaService: {
                get: () => ({
                    getListFilters: mocks.options,
                    getSearchListFilters: mocks.search,
                    getMediaList: mocks.list,
                }),
            },
        },
    }),
}));


beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({
        ratingSystem: "score",
        userMediaSettings: [
            { mediaType: "movies", active: true }
        ]
    });
    mocks.options.mockResolvedValue({
        genres: [
            { name: "Drama" }
        ],
        tags: [
            { name: "Weekend" }
        ],
        langs: [
            { name: "en" }
        ],
    });
    mocks.search.mockResolvedValue([
        { name: "A Director" }
    ]);
    mocks.list.mockResolvedValue({
        items: [],
        pagination: { page: 1, totalPages: 1 }
    });
});


describe("mobile tracking list filters", () => {
    it("uses the subject's real list options and identifies searchable metadata", async () => {
        const result = await getMobileListFilterOptions(20, "movies");
        expect(mocks.options).toHaveBeenCalledWith(20);
        expect(result.groups).toEqual(
            expect.arrayContaining([
                {
                    key: "genres",
                    label: "Genres",
                    searchable: false,
                    options: ["Drama"]
                },
                {
                    key: "tags",
                    label: "Tags",
                    searchable: false,
                    options: ["Weekend"]
                },
                {
                    key: "directors",
                    label: "Directors",
                    searchable: true,
                    options: []
                },
                {
                    key: "langs",
                    label: "Languages",
                    searchable: false,
                    options: ["en"]
                },
            ]),
        );
    });
    it("scopes searchable options to the subject rather than the catalog", async () => {
        expect(await searchMobileListFilterOptions(20, "movies", "directors", "Di")).toEqual(["A Director"]);
        expect(mocks.search).toHaveBeenCalledWith(20, "Di", "directors");
    });
    it("blocks options and searches for unpublished lists before querying them", async () => {
        await expect(getMobileListFilterOptions(20, "books")).rejects.toMatchObject({ mediaType: "books" });
        await expect(searchMobileListFilterOptions(20, "books", "authors", "Al")).rejects.toMatchObject({
            mediaType: "books",
        });
        expect(mocks.options).not.toHaveBeenCalled();
        expect(mocks.search).not.toHaveBeenCalled();
    });
    it("passes multi-select and personal filters through without permitting identity or page-size overrides", async () => {
        const input = listInputSchema.parse({
            status: ["Completed", "Plan to Watch"],
            genres: ["Drama", "Comedy"],
            tags: ["Weekend"],
            directors: ["A, B"],
            favorite: false,
            comment: true,
            hideCommon: true,
            userId: 999,
            currentUserId: 999,
            perPage: 999,
        });
        expect(input).not.toHaveProperty("userId");
        expect(input).not.toHaveProperty("currentUserId");
        expect(input).not.toHaveProperty("perPage");
        await getMobileList(20, "movies", input, 10);
        expect(mocks.list).toHaveBeenCalledWith(
            10,
            20,
            expect.objectContaining({
                status: ["Completed", "Plan to Watch"],
                genres: ["Drama", "Comedy"],
                tags: ["Weekend"],
                directors: ["A, B"],
                favorite: false,
                comment: true,
                hideCommon: true,
                perPage: 30,
            }),
        );
    });
});
