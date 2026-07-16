import {and, countDistinct, eq, gte, lt, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry} from "@/lib/server/database/schema";


export class AdminMediaOverviewRepository {
    static async getUserMediaAddedAndUpdated(mediaType: MediaType) {
        const kind = eq(catalogItem.kind, mediaType);
        const [addedThisMonth, addedLastMonth, updatedThisMonth] = await Promise.all([
            getDbClient().select({ count: countDistinct(libraryEntry.id) })
                .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(kind, gte(libraryEntry.addedAt, sql`date('now', 'start of month')`))).get(),
            getDbClient().select({ count: countDistinct(libraryEntry.id) })
                .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    kind,
                    gte(libraryEntry.addedAt, sql`date('now', '-1 month', 'start of month')`),
                    lt(libraryEntry.addedAt, sql`date('now', 'start of month')`),
                )).get(),
            getDbClient().select({ count: countDistinct(libraryEntry.catalogItemId) })
                .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(kind, gte(libraryEntry.updatedAt, sql`date('now', 'start of month')`))).get(),
        ]);

        const thisMonth = addedThisMonth?.count ?? 0;
        const lastMonth = addedLastMonth?.count ?? 0;
        return {
            added: { thisMonth, lastMonth, comparedToLastMonth: thisMonth - lastMonth },
            updated: { thisMonth: updatedThisMonth?.count ?? 0 },
        };
    }
}
