import {MangaCatalogAdminRepository, MangaCatalogEdit} from "@/lib/server/domain/media/manga/catalog/manga-catalog-admin.repository";
import {MangaLibraryCommands} from "@/lib/server/domain/media/manga/library/manga-library.commands";
import {MangaLibraryRepository} from "@/lib/server/domain/media/manga/library/manga-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {MediaType} from "@/lib/utils/enums";
import {MangaCatalogEditPayload} from "@/lib/contracts/media/catalog-edit";
import {CatalogCoverStorage, relationNames} from "@/lib/server/domain/media/shared/catalog/catalog-edit.shared";


export class MangaCatalogEditCommand {
    constructor(
        private readonly catalog: MangaCatalogAdminRepository,
        private readonly library = new MangaLibraryRepository(),
        private readonly libraryCommands = new MangaLibraryCommands(library),
        private readonly coverStorage = new CatalogCoverStorage(MediaType.MANGA),
    ) {
    }

    async update(catalogItemId: number, payload: MangaCatalogEditPayload) {
        const imageCover = await this.coverStorage.save(payload.imageCover);
        return this.updateEditableFields(catalogItemId, {
            ...payload,
            imageCover,
            genres: relationNames(payload.genres),
        });
    }

    updateEditableFields(catalogItemId: number, edit: MangaCatalogEdit) {
        return withTransaction(async () => {
            const previousEntries = edit.chapters !== undefined
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
