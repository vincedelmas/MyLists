import {asc, eq, gte} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, mangaDetails} from "@/lib/server/database/schema";
import {WcfMediaCapability, WcfMediaCardQuery, WcfMediaRef} from "@/lib/server/domain/which-came-first/wcf-media-capability";
import {wcfEligibility} from "@/lib/server/domain/which-came-first/wcf-eligibility";


export class MangaWcfQuery implements WcfMediaCapability {
    private readonly cards = new WcfMediaCardQuery(MediaType.MANGA);

    getPopularMediaRefs() {
        return getDbClient().select({ id: catalogItem.id, releaseDate: catalogItem.releaseDate })
            .from(mangaDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, mangaDetails.catalogItemId))
            .where(wcfEligibility(MediaType.MANGA, gte(mangaDetails.voteCount, 5000)))
            .orderBy(asc(catalogItem.id)) as Promise<WcfMediaRef[]>;
    }

    findById(mediaId: number) {
        return this.cards.findById(mediaId);
    }
}
