import {Status} from "@/lib/utils/enums";
import type {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, eq, gte, lte, max, notInArray, sql} from "drizzle-orm";
import type {UpcomingNotificationCandidate} from "@/lib/types/notifications.types";
import {catalogItem, libraryEntry, tvDetails, tvSeason} from "@/lib/server/database/schema";


export class TvUpcomingNotificationSource {
    constructor(private readonly kind: TvMediaType) {
    }

    getCandidates(): Promise<UpcomingNotificationCandidate[]> {
        const lastEpisode = getDbClient()
            .select({
                catalogItemId: tvSeason.catalogItemId,
                value: max(tvSeason.episodeCount).as("last_episode"),
            })
            .from(tvSeason)
            .groupBy(tvSeason.catalogItemId)
            .as("last_tv_episode");

        return getDbClient()
            .select({
                mediaId: catalogItem.id,
                userId: libraryEntry.userId,
                mediaName: catalogItem.name,
                lastEpisode: lastEpisode.value,
                date: tvDetails.nextEpisodeAirDate,
                seasonToAir: tvDetails.nextEpisodeSeason,
                episodeToAir: tvDetails.nextEpisodeNumber,
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .innerJoin(lastEpisode, eq(lastEpisode.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, this.kind),
                notInArray(libraryEntry.status, [Status.DROPPED, Status.RANDOM]),
                gte(tvDetails.nextEpisodeAirDate, sql`date('now')`),
                lte(tvDetails.nextEpisodeAirDate, sql`date('now', '+7 days')`),
            ))
            .orderBy(asc(tvDetails.nextEpisodeAirDate));
    }
}
