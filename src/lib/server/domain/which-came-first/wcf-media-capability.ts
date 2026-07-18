import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {CoverType} from "@/lib/types/media-common.types";
import {catalogItem} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";


export type WcfMediaRef = { id: number; releaseDate: string };

type WcfMediaCard = {
    name: string;
    mediaId: number;
    imageCover: string;
    mediaType: MediaType;
};


export interface WcfMediaCapability {
    getPopularMediaRefs(): Promise<WcfMediaRef[]>;

    findById(mediaId: number): Promise<WcfMediaCard | undefined>;
}


/** Shared card projection; each media capability still owns its eligibility policy. */
export class WcfMediaCardQuery {
    constructor(private readonly kind: MediaType) {
    }

    async findById(mediaId: number) {
        const row = getDbClient()
            .select({
                name: catalogItem.name,
                imageCover: catalogItem.imageCover,
            })
            .from(catalogItem)
            .where(and(eq(catalogItem.kind, this.kind), eq(catalogItem.id, mediaId)))
            .get();

        if (!row) return;

        return {
            ...row,
            mediaId,
            mediaType: this.kind,
            imageCover: getImageUrl(`${this.kind}-covers` as CoverType, row.imageCover),
        };
    }
}
