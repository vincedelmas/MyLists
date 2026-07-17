import {asc, eq, gte} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameDetails} from "@/lib/server/database/schema";
import {WcfMediaCapability, WcfMediaCardQuery, WcfMediaRef} from "@/lib/server/domain/which-came-first/wcf-media-capability";
import {wcfEligibility} from "@/lib/server/domain/which-came-first/wcf-eligibility";


export class GameWcfQuery implements WcfMediaCapability {
    private readonly cards = new WcfMediaCardQuery(MediaType.GAMES);

    getPopularMediaRefs() {
        return getDbClient().select({ id: catalogItem.id, releaseDate: catalogItem.releaseDate })
            .from(gameDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, gameDetails.catalogItemId))
            .where(wcfEligibility(MediaType.GAMES, gte(gameDetails.voteCount, 100)))
            .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
    }

    findById(mediaId: number) {
        return this.cards.findById(mediaId);
    }
}
