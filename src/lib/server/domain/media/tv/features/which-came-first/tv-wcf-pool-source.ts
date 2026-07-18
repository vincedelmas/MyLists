import {asc, eq, gte} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, tvDetails} from "@/lib/server/database/schema";
import type {WcfMediaRef} from "@/lib/server/domain/which-came-first/wcf.service";
import {wcfEligibility} from "@/lib/server/domain/which-came-first/wcf.repository";


const MINIMUM_ANIME_VOTES = 50;
const MINIMUM_SERIES_VOTES = 300;


export class TvWcfPoolSource {
    constructor(private readonly kind: TvMediaType) {
    }

    getPopularMediaRefs() {
        const minimumVotes = this.kind === MediaType.SERIES
            ? MINIMUM_SERIES_VOTES
            : MINIMUM_ANIME_VOTES;

        return getDbClient()
            .select({
                id: catalogItem.id,
                releaseDate: catalogItem.releaseDate,
            })
            .from(tvDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, tvDetails.catalogItemId))
            .where(wcfEligibility(this.kind, gte(tvDetails.voteCount, minimumVotes)))
            .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
    }
}
