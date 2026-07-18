import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, eq, gte, notInArray, sql} from "drizzle-orm";
import {catalogItem, movieDetails} from "@/lib/server/database/schema";


const MINIMUM_VOTE_COUNT = 700;


/** Movie-owned eligibility policy for the Mediadle game. */
export class MovieMediadleEligibility {
    static async pickEligibleId(excludedMediaIds: number[]) {
        return MovieMediadleEligibility.eligibleQuery(excludedMediaIds)
            .orderBy(sql`RANDOM()`)
            .limit(1)
            .then(([row]) => row?.id);
    }

    private static eligibleQuery(excludedMediaIds: number[]) {
        return getDbClient()
            .select({ id: catalogItem.id })
            .from(movieDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, movieDetails.catalogItemId))
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                gte(movieDetails.voteCount, MINIMUM_VOTE_COUNT),
                excludedMediaIds.length > 0 ? notInArray(catalogItem.id, excludedMediaIds) : undefined,
            ));
    }
}
