import {and, eq} from "drizzle-orm";
import type {MediaType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import type {SQLiteBunDatabase} from "drizzle-orm/bun-sqlite";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


type TagSeed = {
    name: string;
    userId: number;
    mediaId?: number;
};


export const seedMediaTags = (db: SQLiteBunDatabase, mediaType: MediaType, rows: TagSeed | TagSeed[]) => {
    const { listTable, tagTable } = getServerMediaDefinition(mediaType).repository.tables;

    for (const { name, userId, mediaId } of Array.isArray(rows) ? rows : [rows]) {
        const tag = db
            .insert(schema.mediaTags)
            .values({ name, mediaType, userId })
            .onConflictDoUpdate({
                set: { name },
                target: [schema.mediaTags.userId, schema.mediaTags.mediaType, schema.mediaTags.name],
            }).returning({ id: schema.mediaTags.id })
            .get()!;

        if (mediaId !== undefined) {
            const listEntry = db
                .select({ id: listTable.id })
                .from(listTable)
                .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
                .get();
            if (!listEntry) {
                throw new Error(`Cannot seed tag "${name}": no ${mediaType} list entry for user ${userId}, media ${mediaId}`);
            }
            db.insert(tagTable)
                .values({ listId: listEntry.id, tagId: tag.id })
                .run();
        }
    }
};
