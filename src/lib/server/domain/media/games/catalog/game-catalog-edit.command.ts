import {withTransaction} from "@/lib/server/database/async-storage";
import {GameCatalogAdminRepository, GameCatalogEdit,} from "@/lib/server/domain/media/games/catalog/game-catalog-admin.repository";
import {MediaType} from "@/lib/utils/enums";
import {GameCatalogEditPayload} from "@/lib/contracts/media/catalog-edit";
import {CatalogCoverStorage} from "@/lib/server/domain/media/shared/catalog/catalog-edit.shared";


export class GameCatalogEditCommand {
    constructor(
        private readonly catalog: GameCatalogAdminRepository,
        private readonly coverStorage = new CatalogCoverStorage(MediaType.GAMES),
    ) {
    }

    async update(catalogItemId: number, payload: GameCatalogEditPayload) {
        const imageCover = await this.coverStorage.save(payload.imageCover);
        return this.updateEditableFields(catalogItemId, { ...payload, imageCover });
    }

    updateEditableFields(catalogItemId: number, edit: GameCatalogEdit) {
        return withTransaction(() => this.catalog.updateEditableFields(catalogItemId, edit));
    }
}
