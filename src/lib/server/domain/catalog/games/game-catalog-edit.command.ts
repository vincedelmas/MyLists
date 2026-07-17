import {withTransaction} from "@/lib/server/database/async-storage";
import {
    GameCatalogAdminRepository,
    GameCatalogEdit,
} from "@/lib/server/domain/catalog/games/game-catalog-admin.repository";


export class GameCatalogEditCommand {
    constructor(private readonly catalog: GameCatalogAdminRepository) {}

    updateEditableFields(catalogItemId: number, edit: GameCatalogEdit) {
        return withTransaction(() => this.catalog.updateEditableFields(catalogItemId, edit));
    }
}
