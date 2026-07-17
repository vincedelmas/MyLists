import {MovieCatalogAdminRepository, MovieCatalogEdit} from "@/lib/server/domain/catalog/movies/movie-catalog-admin.repository";
import {MovieLibraryCommands} from "@/lib/server/domain/library/movies/movie-library.commands";
import {MovieLibraryRepository} from "@/lib/server/domain/library/movies/movie-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";


export class MovieCatalogEditCommand {
    constructor(
        private readonly catalog: MovieCatalogAdminRepository,
        private readonly library = new MovieLibraryRepository(),
        private readonly libraryCommands = new MovieLibraryCommands(library),
    ) {}

    getEditableFields(catalogItemId: number) {
        return this.catalog.getEditableFields(catalogItemId);
    }

    lockOldMovies() {
        return this.catalog.lockOldMovies();
    }

    updateEditableFields(catalogItemId: number, edit: MovieCatalogEdit) {
        return withTransaction(async () => {
            const previousEntries = edit.duration !== undefined
                ? await this.library.findEntriesByCatalogItem(catalogItemId)
                : [];
            const updated = await this.catalog.updateEditableFields(catalogItemId, edit);
            if (updated && previousEntries.length > 0) {
                await this.libraryCommands.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
