import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {mediaDetailsPageSchema, type MediaDetailsPage} from "@/lib/contracts/media/details";
import {catalogEditFieldsSchema, type CatalogEditFields} from "@/lib/contracts/media/catalog-edit";
import type {MediaListPage} from "@/lib/contracts/media/lists";


vi.mock("@/lib/client/features/media-details/FamilyDetailsPages", () => ({
    TvDetailsPage: ({ details }: { details: { kind: string } }) => <div data-surface="details" data-family={details.kind}/>,
    MovieDetailsPage: ({ details }: { details: { kind: string } }) => <div data-surface="details" data-family={details.kind}/>,
    GameDetailsPage: ({ details }: { details: { kind: string } }) => <div data-surface="details" data-family={details.kind}/>,
    BookDetailsPage: ({ details }: { details: { kind: string } }) => <div data-surface="details" data-family={details.kind}/>,
    MangaDetailsPage: ({ details }: { details: { kind: string } }) => <div data-surface="details" data-family={details.kind}/>,
}));

vi.mock("@/lib/client/features/media-list/FamilyListViews", () => ({
    TvListView: ({ page }: { page: { kind: string } }) => <div data-surface="list" data-family={page.kind}/>,
    MovieListView: ({ page }: { page: { kind: string } }) => <div data-surface="list" data-family={page.kind}/>,
    GameListView: ({ page }: { page: { kind: string } }) => <div data-surface="list" data-family={page.kind}/>,
    BookListView: ({ page }: { page: { kind: string } }) => <div data-surface="list" data-family={page.kind}/>,
    MangaListView: ({ page }: { page: { kind: string } }) => <div data-surface="list" data-family={page.kind}/>,
}));

vi.mock("@/lib/client/features/catalog-edit/FamilyCatalogEditForms", () => ({
    TvCatalogEditForm: ({ mediaType }: { mediaType: string }) => <div data-surface="catalog" data-family={mediaType}/>,
    MovieCatalogEditForm: () => <div data-surface="catalog" data-family="movies"/>,
    GameCatalogEditForm: () => <div data-surface="catalog" data-family="games"/>,
    BookCatalogEditForm: () => <div data-surface="catalog" data-family="books"/>,
    MangaCatalogEditForm: () => <div data-surface="catalog" data-family="manga"/>,
}));

const {MediaDetailsFamilyBoundary} = await import("./media-details/MediaDetailsFamilyBoundary");
const {MediaListFamilyBoundary} = await import("./media-list/MediaListFamilyBoundary");
const {CatalogEditFamilyBoundary} = await import("./catalog-edit/CatalogEditFamilyBoundary");
const detailsQueryOption: React.ComponentProps<typeof MediaDetailsFamilyBoundary>["queryOption"] = undefined!;
const listQueryOption: React.ComponentProps<typeof MediaListFamilyBoundary>["queryOption"] = undefined!;


describe("rendered media-family boundaries", () => {
    for (const kind of Object.values(MediaType)) {
        it(`renders the concrete ${kind} details, list, and catalog-edit branches`, () => {
            const details = detailsFixture(kind);
            const detailsHtml = renderToStaticMarkup(
                <MediaDetailsFamilyBoundary details={details} queryOption={detailsQueryOption}/>,
            );
            const listHtml = renderToStaticMarkup(
                <MediaListFamilyBoundary
                    page={listFixture(kind)}
                    filters={{ page: 1 }}
                    isCurrent
                    isGrid
                    queryOption={listQueryOption}
                    onChangePage={() => undefined}
                />,
            );
            const catalogHtml = renderToStaticMarkup(
                <CatalogEditFamilyBoundary mediaId={1} data={catalogFixture(kind)}/>,
            );

            expect(detailsHtml).toContain(`data-surface="details" data-family="${kind}"`);
            expect(listHtml).toContain(`data-surface="list" data-family="${kind}"`);
            expect(catalogHtml).toContain(`data-surface="catalog" data-family="${kind}"`);
        });
    }
});


const commonMedia = {
    id: 1,
    name: "Example",
    releaseDate: null,
    synopsis: null,
    imageCover: "cover.jpg",
    lockStatus: false,
    addedAt: null,
    lastApiUpdate: null,
    genres: [],
    providerData: { name: "Provider", url: "https://provider.test/1" },
};


const detailsFixture = (kind: MediaType): MediaDetailsPage => {
    const page = (media: object) => ({ kind, media: { ...commonMedia, kind, ...media }, userMedia: null, followsData: [], similarMedia: [] });
    switch (kind) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return mediaDetailsPageSchema.parse(page({
                apiId: 1, homepage: null, createdBy: null, voteCount: null, popularity: null,
                lastAirDate: null, voteAverage: null, originalName: null, totalSeasons: 1,
                totalEpisodes: 12, originCountry: null, prodStatus: null, seasonToAir: null,
                episodeToAir: null, duration: 24, nextEpisodeToAir: null, actors: [], networks: [],
                seasons: [{ seasonNumber: 1, episodeCount: 12 }],
            }));
        case MediaType.MOVIES:
            return mediaDetailsPageSchema.parse(page({
                apiId: 1, originalName: null, homepage: null, duration: 120, originalLanguage: null,
                voteAverage: null, voteCount: null, popularity: null, budget: null, revenue: null,
                tagline: null, collectionId: null, directorName: null, compositorName: null,
                actors: [], collection: [],
            }));
        case MediaType.GAMES:
            return mediaDetailsPageSchema.parse(page({
                apiId: 1, gameEngine: null, gameModes: null, playerPerspective: null,
                voteAverage: null, voteCount: null, igdbUrl: null, hltbMainTime: null,
                hltbMainAndExtraTime: null, hltbTotalCompleteTime: null, steamApiId: null,
                collectionId: null, platforms: [], companies: [], collection: [],
            }));
        case MediaType.BOOKS:
            return mediaDetailsPageSchema.parse(page({
                apiId: "volume-1", pages: 240, language: null, publishers: null, authors: [],
            }));
        case MediaType.MANGA:
            return mediaDetailsPageSchema.parse(page({
                apiId: 1, originalName: null, chapters: null, prodStatus: null, siteUrl: null,
                endDate: null, volumes: null, voteAverage: null, voteCount: null, popularity: null,
                publishers: null, authors: [],
            }));
    }
};


const listFixture = (kind: MediaType): MediaListPage => {
    const pagination = { page: 1, perPage: 24, totalPages: 0, totalItems: 0, sorting: "name", availableSorting: ["name"] };
    switch (kind) {
        case MediaType.SERIES:
            return { kind: MediaType.SERIES, items: [], pagination };
        case MediaType.ANIME:
            return { kind: MediaType.ANIME, items: [], pagination };
        case MediaType.MOVIES:
            return { kind: MediaType.MOVIES, items: [], pagination };
        case MediaType.GAMES:
            return { kind: MediaType.GAMES, items: [], pagination };
        case MediaType.BOOKS:
            return { kind: MediaType.BOOKS, items: [], pagination };
        case MediaType.MANGA:
            return { kind: MediaType.MANGA, items: [], pagination };
    }
};


const catalogFixture = (kind: MediaType): CatalogEditFields => {
    const common = { name: "Example", releaseDate: null, synopsis: null, lockStatus: false };
    switch (kind) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return catalogEditFieldsSchema.parse({ kind, fields: {
                ...common, originalName: null, lastAirDate: null, homepage: null, createdBy: null,
                duration: 24, originCountry: null, prodStatus: null,
            } });
        case MediaType.MOVIES:
            return catalogEditFieldsSchema.parse({ kind, fields: {
                ...common, originalName: null, directorName: null, duration: 120, budget: null,
                revenue: null, tagline: null, originalLanguage: null, homepage: null,
            } });
        case MediaType.GAMES:
            return catalogEditFieldsSchema.parse({ kind, fields: {
                ...common, gameEngine: null, gameModes: null, playerPerspective: null,
                hltbMainTime: null, hltbMainAndExtraTime: null, hltbTotalCompleteTime: null,
            } });
        case MediaType.BOOKS:
            return catalogEditFieldsSchema.parse({ kind, fields: {
                ...common, pages: 240, language: null, publishers: null, authors: [],
            } });
        case MediaType.MANGA:
            return catalogEditFieldsSchema.parse({ kind, fields: {
                ...common, chapters: null, publishers: null, genres: [],
            } });
    }
};
