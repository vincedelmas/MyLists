import {inArray} from "drizzle-orm";
import type {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {mobileImagePath} from "./images";

// One cover lookup per media type, rather than a request/query for every card.
export const withMobileActivityCovers = <T extends { mediaType: MediaType; mediaId: number }>(items: readonly T[]) => {
    const covers = new Map<string, string>();
    for (const type of new Set(items.map((item) => item.mediaType))) {
        const table = getServerMediaDefinition(type).repository.tables.mediaTable;
        const ids = [...new Set(items.filter((item) => item.mediaType === type).map((item) => item.mediaId))];
        const media = getDbClient()
            .select({ id: table.id, cover: table.imageCover })
            .from(table)
            .where(inArray(table.id, ids))
            .all();
        for (const item of media) covers.set(`${type}:${item.id}`, mobileImagePath(item.cover));
    }
    // A historical update can outlive its catalog entry.
    return items.map((item) => ({ ...item, cover: covers.get(`${item.mediaType}:${item.mediaId}`) ?? null }));
};
