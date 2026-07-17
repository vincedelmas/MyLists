import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem} from "@/lib/server/database/schema";


/** Reusable catalog identity lookup, bound to a concrete media module. */
export class CatalogRefreshIdentityQuery {
    constructor(private readonly kind: MediaType) {}

    get(catalogItemId: number) {
        return getDbClient()
            .select({
                apiId: catalogItem.primaryExternalId,
                lastApiUpdate: catalogItem.lastProviderUpdate,
            })
            .from(catalogItem)
            .where(and(eq(catalogItem.id, catalogItemId), eq(catalogItem.kind, this.kind)))
            .get();
    }
}
