import {ApiProviderType} from "@/lib/utils/enums";
import {UpsertMangaWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalJikanMangaMatcher} from "@/lib/server/domain/imports/matchers/external-manga.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {MangaImportListWriter} from "@/lib/server/domain/imports/list-writers/manga-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {MangaLibraryCommands} from "@/lib/server/domain/library/manga/manga-library.commands";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.repository";


export const createMangaMatcher = (
    catalog: MangaCatalogIngestionRepository,
    mangaProvider: ExternalMediaProvider<UpsertMangaWithDetails>,
    mangaIngestion: MediaIngestionService<UpsertMangaWithDetails>,
    libraryCommands: MangaLibraryCommands,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.MANGA, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalJikanMangaMatcher(mangaProvider, mangaIngestion),
    ],
    listWriter: new MangaImportListWriter(catalog, libraryCommands),
});
