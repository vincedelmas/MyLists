import {ApiProviderType} from "@/lib/utils/enums";
import {MangaService} from "@/lib/server/domain/media/manga/manga.service";
import {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalJikanMangaMatcher} from "@/lib/server/domain/imports/matchers/external-manga.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {MangaImportListWriter} from "@/lib/server/domain/imports/list-writers/manga-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";


export const createMangaMatcher = (
    mangaService: MangaService,
    mangaProvider: ExternalMediaProvider<UpsertMangaWithDetails>,
    mangaIngestion: MediaIngestionService<UpsertMangaWithDetails>,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.MANGA, mangaService),
        internalNameDateMatcher(mangaService),
    ],
    externalMatchers: [
        new ExternalJikanMangaMatcher(mangaProvider, mangaIngestion),
    ],
    listWriter: new MangaImportListWriter(mangaService),
});
