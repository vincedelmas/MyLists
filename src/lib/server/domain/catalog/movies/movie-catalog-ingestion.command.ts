import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-ingestion.repository";
import {MovieLibraryCommands} from "@/lib/server/domain/library/movies/movie-library.commands";
import {MovieLibraryRepository} from "@/lib/server/domain/library/movies/movie-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";


export class MovieCatalogIngestionCommand implements MediaIngestionRepository<UpsertMovieWithDetails> {
    constructor(
        private readonly catalog: MovieCatalogIngestionRepository,
        private readonly library = new MovieLibraryRepository(),
        private readonly libraryCommands = new MovieLibraryCommands(library),
    ) {}

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    storeMediaWithDetails(details: UpsertMovieWithDetails) {
        return withTransaction(() => this.catalog.storeMediaWithDetails(details));
    }

    updateMediaWithDetails(details: UpsertMovieWithDetails) {
        return withTransaction(async () => {
            const existing = await this.catalog.findByApiId(details.mediaData.apiId);
            if (!existing) return false;
            const previousEntries = await this.library.findEntriesByCatalogItem(existing.id);
            const updated = await this.catalog.updateMediaWithDetails(details);
            if (updated && previousEntries.length > 0) {
                await this.libraryCommands.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
