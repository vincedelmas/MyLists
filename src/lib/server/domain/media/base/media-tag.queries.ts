import {MediaType, TagAction} from "@/lib/utils/enums";
import {mediaTags} from "@/lib/server/database/schema";
import type {Tag} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {and, asc, count, eq, inArray, sql} from "drizzle-orm";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import type {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {removeDynamicListTagReferences} from "@/lib/server/domain/dynamic-lists/dynamic-list-tags.queries";


export const getMediaTagNames = (mediaType: MediaType, userId: number) => {
    return getDbClient()
        .select({ name: mediaTags.name })
        .from(mediaTags)
        .where(and(eq(mediaTags.userId, userId), eq(mediaTags.mediaType, mediaType)))
        .orderBy(asc(mediaTags.name))
        .all();
};


export const createMediaTagQueries = (definition: AnyServerMediaDefinition) => {
    const { identity: { mediaType }, repository: { tables: { tagTable } } } = definition;

    return {
        async getTagNames(userId: number) {
            return getMediaTagNames(mediaType, userId);
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
                    if (mediaId !== undefined) {
                        db.insert(tagTable).values({ userId, mediaId, tagId: identity.id }).run();
                    }
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

                const identity = db
                    .select({ id: mediaTags.id })
                    .from(mediaTags)
                    .where(and(owner, eq(mediaTags.name, tag.name)))
                    .get();

                if (!identity) return;

                if (action === TagAction.DELETE_ONE) {
                    db.delete(tagTable)
                        .where(and(
                            eq(tagTable.userId, userId),
                            eq(tagTable.tagId, identity.id),
                            eq(tagTable.mediaId, mediaId!),
                        )).run();
                }
                else if (action === TagAction.DELETE_ALL) {
                    db.delete(mediaTags)
                        .where(eq(mediaTags.id, identity.id))
                        .run();

                    removeDynamicListTagReferences(userId, mediaType, [identity.id]);
                }
            });
        },

        removeMediaAssignments(mediaIds: number[], userId?: number) {
            return getDbClient()
                .delete(tagTable)
                .where(and(
                    inArray(tagTable.mediaId, mediaIds),
                    userId === undefined ? undefined : eq(tagTable.userId, userId),
                )).run();
        },

        async getTagsView(userId: number) {
            return getDbClient()
                .select({
                    tagName: mediaTags.name,
                    totalCount: count(tagTable.mediaId),
                }).from(mediaTags)
                .leftJoin(tagTable, eq(mediaTags.id, tagTable.tagId))
                .where(and(eq(mediaTags.userId, userId), eq(mediaTags.mediaType, mediaType)))
                .groupBy(mediaTags.id)
                .orderBy(sql`${mediaTags.name} COLLATE NOCASE`, asc(mediaTags.name))
                .all();
        },
    };
};
