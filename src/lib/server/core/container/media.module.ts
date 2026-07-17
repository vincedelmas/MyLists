import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {setupTvMediaModule} from "@/lib/server/core/container/media/tv-media.module";
import {CatalogEditCommands} from "@/lib/server/domain/catalog/catalog-edit.commands";
import {setupGameMediaModule} from "@/lib/server/core/container/media/game-media.module";
import {setupBookMediaModule} from "@/lib/server/core/container/media/book-media.module";
import {setupMovieMediaModule} from "@/lib/server/core/container/media/movie-media.module";
import {setupMangaMediaModule} from "@/lib/server/core/container/media/manga-media.module";
import {LibraryCsvExportService} from "@/lib/server/domain/library/library-csv-export.service";
import {LibraryStatsRebuildService} from "@/lib/server/domain/library/library-stats-rebuild.service";
import {MediaModuleMap, MediaModuleRegistry} from "@/lib/server/core/container/media/media-module.registry";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";


export function setupMediaModule(apiClients: ApiClientModule) {
    const refreshCandidates = new CatalogRefreshCandidateRepository();

    const modules: MediaModuleMap = {
        [MediaType.SERIES]: setupTvMediaModule(MediaType.SERIES, apiClients, refreshCandidates),
        [MediaType.ANIME]: setupTvMediaModule(MediaType.ANIME, apiClients, refreshCandidates),
        [MediaType.MOVIES]: setupMovieMediaModule(apiClients, refreshCandidates),
        [MediaType.GAMES]: setupGameMediaModule(apiClients, refreshCandidates),
        [MediaType.BOOKS]: setupBookMediaModule(apiClients, refreshCandidates),
        [MediaType.MANGA]: setupMangaMediaModule(apiClients, refreshCandidates),
    };

    const registry = new MediaModuleRegistry(modules);

    const catalogEdit = new CatalogEditCommands(
        {
            [MediaType.SERIES]: modules[MediaType.SERIES].catalog.edit,
            [MediaType.ANIME]: modules[MediaType.ANIME].catalog.edit,
        },
        modules[MediaType.MOVIES].catalog.edit,
        modules[MediaType.GAMES].catalog.edit,
        modules[MediaType.BOOKS].catalog.edit,
        modules[MediaType.MANGA].catalog.edit,
    );
    return {
        registry,
        shared: {
            catalogEdit,
            library: {
                csvExport: new LibraryCsvExportService(),
                statsRebuilder: new LibraryStatsRebuildService(),
            },
        },
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
