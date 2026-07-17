import {MangaCatalogAdminRepository, MangaCatalogEdit} from "@/lib/server/domain/catalog/manga/manga-catalog-admin.repository";
import {MangaLibraryCommands} from "@/lib/server/domain/library/manga/manga-library.commands";
import {MangaLibraryRepository} from "@/lib/server/domain/library/manga/manga-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";


export class MangaCatalogEditCommand {
    constructor(
        private readonly catalog: MangaCatalogAdminRepository,
        private readonly library = new MangaLibraryRepository(),
        private readonly libraryCommands = new MangaLibraryCommands(library),
    ) {}

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
