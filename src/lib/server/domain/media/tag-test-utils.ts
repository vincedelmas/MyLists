import type {MediaType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import type {SQLiteBunDatabase} from "drizzle-orm/bun-sqlite";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


type TagSeed = {
    id?: number;
    name: string;
    userId: number;
    mediaId?: number;
};


export const seedMediaTags = (db: SQLiteBunDatabase, mediaType: MediaType, rows: TagSeed | TagSeed[]) => {
    const { tagTable } = getServerMediaDefinition(mediaType).repository.tables;

    for (const { name, ...assignment } of Array.isArray(rows) ? rows : [rows]) {
        const tag = db
            .insert(schema.mediaTags)
            .values({
                name,
                mediaType,
                userId: assignment.userId,
            })
            .onConflictDoUpdate({
                set: { name },
                target: [schema.mediaTags.userId, schema.mediaTags.mediaType, schema.mediaTags.name],
            }).returning({ id: schema.mediaTags.id })
            .get()!;

        if (assignment.mediaId !== undefined) {
            db.insert(tagTable)
                .values({ ...assignment, mediaId: assignment.mediaId, tagId: tag.id })
                .run();
        }
    }
};
