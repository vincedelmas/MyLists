import {and, eq, inArray} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, movieDetails} from "@/lib/server/database/schema";
import {ActivityDurationSource} from "@/lib/server/domain/media/shared/activity/catalog-activity.query";


export class MovieActivityDurationQuery implements ActivityDurationSource {
    getByIds(mediaIds: number[]) {
        return getDbClient().select({
            id: catalogItem.id,
            duration: movieDetails.durationMinutes,
        }).from(catalogItem)
            .leftJoin(movieDetails, eq(catalogItem.id, movieDetails.catalogItemId))
            .where(and(eq(catalogItem.kind, MediaType.MOVIES), inArray(catalogItem.id, mediaIds)));
    }
}
