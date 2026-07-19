import {MovieCatalogAdminRepository, MovieCatalogEdit} from "@/lib/server/domain/media/movies/catalog/movie-catalog-admin.repository";
import {createMovieLibrary, MovieLibrary} from "@/lib/server/domain/media/movies/library/movie-library";
import {withTransaction} from "@/lib/server/database/async-storage";
import {MediaType} from "@/lib/utils/enums";
import {MovieCatalogEditPayload} from "@/lib/contracts/media/catalog-edit";
import {CatalogCoverStorage} from "@/lib/server/domain/media/shared/catalog/catalog-edit.shared";


export class MovieCatalogEditCommand {
    constructor(
        private readonly catalog: MovieCatalogAdminRepository,
        private readonly library: MovieLibrary = createMovieLibrary(),
        private readonly coverStorage = new CatalogCoverStorage(MediaType.MOVIES),
    ) {
    }

    async update(catalogItemId: number, payload: MovieCatalogEditPayload) {
        const imageCover = await this.coverStorage.save(payload.imageCover);
        return this.updateEditableFields(catalogItemId, { ...payload, imageCover });
    }

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
                await this.library.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
