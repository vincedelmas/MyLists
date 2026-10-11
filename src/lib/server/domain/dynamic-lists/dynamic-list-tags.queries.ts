import {and, eq, inArray} from "drizzle-orm";
import type {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {dynamicLists, mediaTags} from "@/lib/server/database/schema";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";


export const getDynamicListTagNames = (userId: number, specs: DynamicListSpec[]): Record<number, string> => {
    const references = specs.flatMap(spec => Object.entries(spec.filters.mediaFilters ?? {})
        .flatMap(([mediaType, filters]) => (filters.tagRules ?? [])
            .flatMap(rule => [...(rule.tags ?? []), ...(rule.excludeTags ?? [])].map(id => ({ id, mediaType }))),
        ));

    if (!references.length) {
        return {};
    }

    const tags = getDbClient()
        .select({
            id: mediaTags.id,
            name: mediaTags.name,
            mediaType: mediaTags.mediaType,
        })
        .from(mediaTags)
        .where(and(
            eq(mediaTags.userId, userId),
            inArray(mediaTags.id, [...new Set(references.map(tag => tag.id))])
        )).all();

    const byId = new Map(tags.map(tag => [tag.id, tag]));

    if (references.some(tag => byId.get(tag.id)?.mediaType !== tag.mediaType)) {
        throw new FormattedError("Choose tags from your own tracking list for this media type.");
    }

    return Object.fromEntries(tags.map(tag => [tag.id, tag.name]));
};


// Called in tag deletion transaction, JSON references can't use foreign-key cascades
export const removeDynamicListTagReferences = (userId: number, mediaType: MediaType, tagIds: number[]) => {
    const db = getDbClient();
    const deleted = new Set(tagIds);

    const lists = db
        .select({
            id: dynamicLists.id,
            spec: dynamicLists.spec,
        }).from(dynamicLists)
        .where(eq(dynamicLists.userId, userId))
        .all();

    for (const { id, spec } of lists) {
        const filters = spec.filters.mediaFilters?.[mediaType];

        if (!filters?.tagRules?.some(rule => [...(rule.tags ?? []), ...(rule.excludeTags ?? [])].some(tagId => deleted.has(tagId)))) {
            continue;
        }

        const tagRules = filters.tagRules.map(rule => ({
            ...rule,
            tags: rule.tags?.filter(tagId => !deleted.has(tagId)),
            excludeTags: rule.excludeTags?.filter(tagId => !deleted.has(tagId)),
        })).filter(rule => rule.tags?.length || rule.excludeTags?.length);

        db.update(dynamicLists)
            .set({
                spec: {
                    ...spec, filters: {
                        ...spec.filters, mediaFilters: { ...spec.filters.mediaFilters, [mediaType]: { ...filters, tagRules } }
                    }
                },
                updatedAt: new Date().toISOString(),
            }).where(eq(dynamicLists.id, id))
            .run();
    }
};
