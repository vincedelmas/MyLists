import {TagAction} from "@/lib/utils/enums";
import type {SimpleSearch} from "@/lib/schemas";
import type {Tag} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {and, asc, count, countDistinct, eq, like, sql} from "drizzle-orm";
import type {AnyMediaRepositoryDefinition} from "@/lib/media-definitions/base/media.definition.server";


export const createMediaTagQueries = (definition: AnyMediaRepositoryDefinition) => {
    const { tagTable } = definition.tables;

    return {
        async getTagNames(userId: number) {
            return getDbClient()
                .selectDistinct({ name: sql<string>`${tagTable.name}` })
                .from(tagTable)
                .where(eq(tagTable.userId, userId))
                .orderBy(asc(tagTable.name));
        },

        editUserTag(userId: number, tag: Tag, action: TagAction, mediaId?: number) {
            const db = getDbClient();

            if (action === TagAction.ADD) {
                const [tagData] = db
                    .insert(tagTable)
                    .values({ userId, name: tag.name, mediaId })
                    .returning({ name: tagTable.name }).all();

                return tagData satisfies Tag;
            }
            else if (action === TagAction.RENAME) {
                if (!tag.oldName) return;

                const existingTag = db
                    .select()
                    .from(tagTable)
                    .where(and(eq(tagTable.userId, userId), eq(tagTable.name, tag.name)))
                    .get();

                if (existingTag) {
                    throw new FormattedError("A tag with this name already exists.");
                }

                const [tagData] = db
                    .update(tagTable)
                    .set({ name: tag.name })
                    .where(and(
                        eq(tagTable.userId, userId),
                        eq(tagTable.name, tag.oldName)
                    )).returning({ name: tagTable.name }).all();
                return tagData satisfies Tag;
            }
            else if (action === TagAction.DELETE_ONE) {
                if (!mediaId) return;

                db
                    .delete(tagTable)
                    .where(and(eq(tagTable.userId, userId), eq(tagTable.name, tag.name), eq(tagTable.mediaId, mediaId))).run();
            }
            else if (action === TagAction.DELETE_ALL) {
                db
                    .delete(tagTable)
                    .where(and(eq(tagTable.userId, userId), eq(tagTable.name, tag.name))).run();
            }
        },

        async getTagsView(userId: number, search: SimpleSearch) {
            const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
            const searchCondition = search.search ? like(tagTable.name, `%${search.search}%`) : undefined;

            const [{ total, exactMatch }, items] = await Promise.all([
                getDbClient()
                    .select({
                        total: countDistinct(tagTable.name),
                        exactMatch: search.search
                            ? sql<number>`max(case when lower(${tagTable.name}) = lower(${search.search}) then 1 else 0 end)`
                            : sql<number>`0`,
                    })
                    .from(tagTable)
                    .where(and(eq(tagTable.userId, userId), searchCondition))
                    .then(([result]) => result),
                getDbClient()
                    .select({
                        tagName: sql<string>`${tagTable.name}`,
                        totalCount: count(tagTable.mediaId),
                    })
                    .from(tagTable)
                    .where(and(eq(tagTable.userId, userId), searchCondition))
                    .groupBy(tagTable.name)
                    .orderBy(sql`${tagTable.name} COLLATE NOCASE`, asc(tagTable.name))
                    .limit(pagination.limit)
                    .offset(pagination.offset),
            ]);

            return {
                total,
                items: items,
                page: pagination.page,
                exactMatch: !!exactMatch,
                perPage: pagination.perPage,
                pages: Math.ceil(total / pagination.perPage),
            };
        },
    };
};
