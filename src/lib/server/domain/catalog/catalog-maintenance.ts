import {MediaType} from "@/lib/utils/enums";
import {CatalogOrphanRepository} from "@/lib/server/domain/catalog/catalog-orphan.repository";
import {CatalogCoverReferenceRepository} from "@/lib/server/domain/catalog/catalog-cover-reference.repository";


/** Binds generic catalog maintenance mechanisms to one concrete media module. */
export const createCatalogMaintenance = (
    kind: MediaType,
    orphans = new CatalogOrphanRepository(),
    coverReferences = new CatalogCoverReferenceRepository(),
) => ({
    orphans: {
        find: () => orphans.getOrphanedIds(kind),
        delete: (catalogItemIds: number[]) => orphans.deleteItems(kind, catalogItemIds),
    },
    covers: {
        getReferences: () => coverReferences.getReferences(kind),
    },
});
