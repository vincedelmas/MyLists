import {ApiProviderType} from "@/lib/utils/enums";
import {MangaService} from "@/lib/server/domain/media/manga/manga.service";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMalMangaMatcher} from "@/lib/server/domain/media/manga/external-manga.matcher";
import {MangaImportListWriter} from "@/lib/server/domain/media/manga/manga-import-list.writer";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";


export const createMangaMatcher = (
    mangaService: MangaService,
    mangaProvider: ExternalMediaProvider<UpsertMangaWithDetails>,
    mangaIngestion: MediaIngestionService,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.MANGA, mangaService),
        internalNameDateMatcher(mangaService, ApiProviderType.MANGA),
    ],
    externalMatchers: [
        new ExternalMalMangaMatcher(mangaProvider, mangaIngestion),
    ],
    listWriter: new MangaImportListWriter(mangaService),
});
