import {TvCatalogAdminRepository, TvCatalogEdit} from "@/lib/server/domain/catalog/tv/tv-catalog-admin.repository";
import {TvLibraryCommands} from "@/lib/server/domain/library/tv/tv-library.commands";
import {TvLibraryRepository} from "@/lib/server/domain/library/tv/tv-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {TvCatalogEditPayload} from "@/lib/contracts/media/catalog-edit";
import {MediaType} from "@/lib/utils/enums";
import {CatalogCoverStorage} from "@/lib/server/domain/catalog/catalog-edit.shared";


export class TvCatalogEditCommand {
    constructor(
        private readonly catalog: TvCatalogAdminRepository,
        private readonly library = new TvLibraryRepository(),
        private readonly libraryCommands = new TvLibraryCommands(library),
        private readonly coverStorage = new CatalogCoverStorage(MediaType.SERIES),
    ) {}

    async update(catalogItemId: number, payload: TvCatalogEditPayload) {
        const imageCover = await this.coverStorage.save(payload.imageCover);
        return this.updateEditableFields(catalogItemId, { ...payload, imageCover });
    }

    updateEditableFields(catalogItemId: number, edit: TvCatalogEdit) {
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
