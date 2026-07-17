import {ApiProviderType} from "@/lib/utils/enums";
import {MangaCatalogSnapshot} from "@/lib/server/domain/media/manga/catalog/manga-catalog-snapshot";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalJikanMangaMatcher} from "@/lib/server/domain/media/manga/imports/external-manga.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {MangaImportListWriter} from "@/lib/server/domain/media/manga/imports/manga-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {MangaLibraryCommands} from "@/lib/server/domain/media/manga/library/manga-library.commands";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/media/manga/catalog/manga-catalog-ingestion.repository";


export const createMangaMatcher = (
    catalog: MangaCatalogIngestionRepository,
    mangaProvider: ExternalMediaProvider<MangaCatalogSnapshot>,
    mangaIngestion: MediaIngestionService<MangaCatalogSnapshot>,
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
