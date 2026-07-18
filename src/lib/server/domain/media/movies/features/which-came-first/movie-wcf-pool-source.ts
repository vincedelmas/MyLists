import {asc, eq, gte} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, movieDetails} from "@/lib/server/database/schema";
import type {WcfMediaRef} from "@/lib/server/domain/which-came-first/wcf.service";
import {wcfEligibility} from "@/lib/server/domain/which-came-first/wcf.repository";


const MINIMUM_VOTE_COUNT = 1000;


export class MovieWcfPoolSource {
    static getPopularMediaRefs() {
        return getDbClient()
            .select({
                id: catalogItem.id,
                releaseDate: catalogItem.releaseDate,
            })
            .from(movieDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, movieDetails.catalogItemId))
            .where(wcfEligibility(MediaType.MOVIES, gte(movieDetails.voteCount, MINIMUM_VOTE_COUNT)))
            .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
    }
}
