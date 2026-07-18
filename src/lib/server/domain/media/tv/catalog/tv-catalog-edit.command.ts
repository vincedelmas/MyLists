import {TvCatalogAdminRepository, TvCatalogEdit} from "@/lib/server/domain/media/tv/catalog/tv-catalog-admin.repository";
import {TvLibraryService} from "@/lib/server/domain/media/tv/library/tv-library.service";
import {withTransaction} from "@/lib/server/database/async-storage";
import {TvCatalogEditPayload} from "@/lib/contracts/media/catalog-edit";
import {MediaType} from "@/lib/utils/enums";
import {CatalogCoverStorage} from "@/lib/server/domain/media/shared/catalog/catalog-edit.shared";
import {TvMediaType} from "@/lib/types/media-kind.types";


export class TvCatalogEditCommand<K extends TvMediaType> {
    constructor(
        private readonly catalog: TvCatalogAdminRepository,
        private readonly library: TvLibraryService<K>,
        private readonly coverStorage = new CatalogCoverStorage(MediaType.SERIES),
    ) {
    }

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
                await this.library.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
