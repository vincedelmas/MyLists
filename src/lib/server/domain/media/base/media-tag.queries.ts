import {TagAction} from "@/lib/utils/enums";
import {mediaTags} from "@/lib/server/database/schema";
import type {Tag} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {and, asc, count, eq, inArray, notExists, type SQL, sql} from "drizzle-orm";
import {removeDynamicListTagReferences} from "@/lib/server/domain/dynamic-lists/dynamic-list-tags.queries";
import type {AnyServerMediaDefinition, BaseMediaTables} from "@/lib/media-definitions/base/media.definition.server";


export const getMediaTagNames = (tagTable: BaseMediaTables["tagTable"], userId: number) => getDbClient()
    .selectDistinct({ name: mediaTags.name })
    .from(tagTable)
    .innerJoin(mediaTags, eq(mediaTags.id, tagTable.tagId))
    .where(eq(tagTable.userId, userId))
    .orderBy(asc(mediaTags.name))
    .all();


export const createMediaTagQueries = (definition: AnyServerMediaDefinition) => {
    const { identity: { mediaType }, repository: { tables: { tagTable } } } = definition;

    const removeAssignments = (condition: SQL) => {
        const db = getDbClient();
        const removed = db
            .delete(tagTable)
            .where(condition)
            .returning({ tagId: tagTable.tagId })
            .all();

        if (!removed.length) return;

        const deleted = db
            .delete(mediaTags)
            .where(and(
                inArray(mediaTags.id, [...new Set(removed.map(row => row.tagId))]),
                notExists(db
                    .select({ id: tagTable.id })
                    .from(tagTable)
                    .where(eq(tagTable.tagId, mediaTags.id))
                ),
            )).returning({ id: mediaTags.id, userId: mediaTags.userId })
            .all();

        const byUser = new Map<number, number[]>();
        for (const tag of deleted) {
            const ids = byUser.get(tag.userId) ?? [];
            ids.push(tag.id);
            byUser.set(tag.userId, ids);
        }

        for (const [userId, ids] of byUser) {
            removeDynamicListTagReferences(userId, mediaType, ids);
        }
    };

    return {
        async getTagNames(userId: number) {
            return getMediaTagNames(tagTable, userId);
        },

        editUserTag(userId: number, tag: Tag, action: TagAction, mediaId?: number) {
            return withTransaction(() => {
                const db = getDbClient();
                const owner = and(eq(mediaTags.userId, userId), eq(mediaTags.mediaType, mediaType));

                if (action === TagAction.ADD) {
                    let identity = db.select().from(mediaTags).where(and(owner, eq(mediaTags.name, tag.name))).get();
                    if (!identity) {
                        identity = db.insert(mediaTags).values({ userId, mediaType, name: tag.name }).returning().get()!;
                    }
                    db.insert(tagTable).values({ userId, mediaId, tagId: identity.id }).run();
                    return { name: identity.name } satisfies Tag;
                }
                if (action === TagAction.RENAME) {
                    const existing = db.select({ id: mediaTags.id }).from(mediaTags)
                        .where(and(owner, eq(mediaTags.name, tag.name))).get();
                    if (existing) throw new FormattedError("A tag with this name already exists.");
                    return db.update(mediaTags).set({ name: tag.name })
                        .where(and(owner, eq(mediaTags.name, tag.oldName!)))
                        .returning({ name: mediaTags.name }).get();
                }

                const identity = db.select({ id: mediaTags.id }).from(mediaTags)
                    .where(and(owner, eq(mediaTags.name, tag.name))).get();
                if (!identity) return;

                if (action === TagAction.DELETE_ONE) {
                    removeAssignments(and(eq(tagTable.userId, userId), eq(tagTable.tagId, identity.id), eq(tagTable.mediaId, mediaId!))!);
                }
                else if (action === TagAction.DELETE_ALL) {
                    db.delete(mediaTags).where(eq(mediaTags.id, identity.id)).run();
                    removeDynamicListTagReferences(userId, mediaType, [identity.id]);
                }
            });
        },

        removeMediaAssignments(mediaIds: number[], userId?: number) {
            return withTransaction(() => removeAssignments(and(
                inArray(tagTable.mediaId, mediaIds),
                userId === undefined ? undefined : eq(tagTable.userId, userId),
            )!));
        },

        async getTagsView(userId: number) {
            return getDbClient()
                .select({ tagName: mediaTags.name, totalCount: count(tagTable.mediaId) })
                .from(tagTable)
                .innerJoin(mediaTags, eq(mediaTags.id, tagTable.tagId))
                .where(eq(tagTable.userId, userId))
                .groupBy(mediaTags.id)
                .orderBy(sql`${mediaTags.name} COLLATE NOCASE`, asc(mediaTags.name)).all();
        },
    };
};
