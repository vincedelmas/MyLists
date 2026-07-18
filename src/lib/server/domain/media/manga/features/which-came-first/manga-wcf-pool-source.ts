import {asc, eq, gte} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, mangaDetails} from "@/lib/server/database/schema";
import type {WcfMediaRef} from "@/lib/server/domain/which-came-first/wcf.service";
import {wcfEligibility} from "@/lib/server/domain/which-came-first/wcf.repository";


const MINIMUM_VOTE_COUNT = 5000;


export class MangaWcfPoolSource {
    static getPopularMediaRefs() {
        return getDbClient()
            .select({
                id: catalogItem.id,
                releaseDate: catalogItem.releaseDate,
            })
            .from(mangaDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, mangaDetails.catalogItemId))
            .where(wcfEligibility(MediaType.MANGA, gte(mangaDetails.voteCount, MINIMUM_VOTE_COUNT)))
            .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
    }
}
