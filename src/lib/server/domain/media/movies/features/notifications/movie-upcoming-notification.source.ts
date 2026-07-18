import {MediaType} from "@/lib/utils/enums";
import {and, asc, eq, gte, lte, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry} from "@/lib/server/database/schema";
import type {UpcomingNotificationCandidate} from "@/lib/types/notifications.types";


export class MovieUpcomingNotificationSource {
    static getCandidates(): Promise<UpcomingNotificationCandidate[]> {
        return getDbClient()
            .select({
                mediaId: catalogItem.id,
                userId: libraryEntry.userId,
                mediaName: catalogItem.name,
                date: catalogItem.releaseDate,
            })
            .from(catalogItem)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                gte(catalogItem.releaseDate, sql`date('now')`),
                lte(catalogItem.releaseDate, sql`date('now', '+7 days')`),
            ))
            .orderBy(asc(catalogItem.releaseDate), asc(catalogItem.id));
    }
}
