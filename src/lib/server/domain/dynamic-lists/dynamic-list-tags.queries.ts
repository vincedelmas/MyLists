import {and, eq, inArray} from "drizzle-orm";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {mediaTags} from "@/lib/server/database/schema";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";


export const getDynamicListTagNames = (userId: number, specs: DynamicListSpec[]): Record<number, string> => {
    const references = specs.flatMap(spec => Object.entries(spec.filters.mediaFilters ?? {}).flatMap(([mediaType, filters]) =>
        (filters.tagRules ?? []).flatMap(rule => [...(rule.tags ?? []), ...(rule.excludeTags ?? [])].map(id => ({ id, mediaType }))),
    ));
    if (!references.length) return {};

    const tags = getDbClient().select().from(mediaTags)
        .where(and(eq(mediaTags.userId, userId), inArray(mediaTags.id, [...new Set(references.map(tag => tag.id))]))).all();
    const byId = new Map(tags.map(tag => [tag.id, tag]));
    if (references.some(tag => byId.get(tag.id)?.mediaType !== tag.mediaType)) {
        throw new FormattedError("Choose tags from your own tracking list for this media type.");
    }

    return Object.fromEntries(tags.map(tag => [tag.id, tag.name]));
};
