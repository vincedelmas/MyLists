import {and, eq, inArray} from "drizzle-orm";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, tvDetails} from "@/lib/server/database/schema";
import {ActivityDurationSource} from "@/lib/server/domain/media/shared/activity/catalog-activity.query";


export class TvActivityDurationQuery implements ActivityDurationSource {
    constructor(private readonly kind: TvMediaType) {
    }

    getByIds(mediaIds: number[]) {
        return getDbClient().select({
            id: catalogItem.id,
            duration: tvDetails.episodeDurationMinutes,
        }).from(catalogItem)
            .leftJoin(tvDetails, eq(catalogItem.id, tvDetails.catalogItemId))
            .where(and(eq(catalogItem.kind, this.kind), inArray(catalogItem.id, mediaIds)));
    }
}
