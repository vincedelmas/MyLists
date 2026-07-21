import {sql} from "drizzle-orm";
import {user} from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {imageUrl, nullableImageUrl} from "@/lib/server/database/custom-types";
import {check, index, integer, real, SQLiteColumn, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const commonMediaCols = (mediaTypeName: MediaType) => {
    return {
        id: integer("id").primaryKey().notNull(),
        name: text("name").notNull(),
        releaseDate: text("release_date"),
        synopsis: text("synopsis"),
        imageCover: imageUrl("image_cover", `${mediaTypeName}-covers`).notNull(),
        lockStatus: integer({ mode: "boolean" }),
        addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
        lastApiUpdate: text("last_api_update"),
    };
};


export const commonMediaListCols = (modelMediaId: SQLiteColumn, mediaTypeName: MediaType) => {
    return {
        id: integer("id").primaryKey().notNull(),
        userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
        mediaId: integer("media_id").notNull().references(() => modelMediaId),
        status: text("status").$type<Status>().notNull(),
        favorite: integer("favorite", { mode: "boolean" }),
        comment: text("comment"),
        rating: real("rating"),
        customCover: nullableImageUrl("custom_cover", `${mediaTypeName}-covers`),
        addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
        lastUpdated: text("last_updated"),
    };
};


export const commonMediaListIndexes = (table: {
    userId: SQLiteColumn;
    mediaId: SQLiteColumn;
    status: SQLiteColumn;
    rating: SQLiteColumn;
    favorite: SQLiteColumn
}, mediaTypeName: MediaType) => {
    return [
        uniqueIndex(`ux_${mediaTypeName}_list_user_media`).on(table.userId, table.mediaId),
        index(`ix_${mediaTypeName}_list_media_id`).on(table.mediaId),
        index(`ix_${mediaTypeName}_list_user_media_rated`).on(table.userId, table.mediaId).where(sql`${table.rating} IS NOT NULL`),
        index(`ix_${mediaTypeName}_list_media_user_rated`).on(table.mediaId, table.userId).where(sql`${table.rating} IS NOT NULL`),
        check(`${mediaTypeName}_list_rating_check`, sql`${table.rating} IS NULL OR (${table.rating} >= 0 AND ${table.rating} <= 10)`),
    ];
};


export const commonGenericCols = (modelMediaId: SQLiteColumn) => {
    return {
        id: integer().primaryKey().notNull(),
        mediaId: integer().notNull().references(() => modelMediaId),
        name: text("name").notNull(),
    };
};


export const commonGenericIndexes = (table: { mediaId: SQLiteColumn; name: SQLiteColumn }, tableName: string) => {
    return [
        uniqueIndex(`ux_${tableName}_media_name`).on(table.mediaId, table.name),
        index(`ix_${tableName}_name_media`).on(table.name, table.mediaId),
    ];
};


export const commonMediaTagsCols = (modelMediaId: SQLiteColumn) => {
    return {
        id: integer().primaryKey().notNull(),
        userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
        mediaId: integer().references(() => modelMediaId),
        name: text("name").notNull(),
    };
};


export const commonMediaTagsIndexes = (table: { userId: SQLiteColumn; mediaId: SQLiteColumn; name: SQLiteColumn }, mediaTypeName: MediaType) => {
    return [
        uniqueIndex(`ux_${mediaTypeName}_tags_user_media_name`)
            .on(table.userId, table.mediaId, table.name)
            .where(sql`${table.mediaId} IS NOT NULL`),
        uniqueIndex(`ux_${mediaTypeName}_tags_user_placeholder_name`)
            .on(table.userId, table.name)
            .where(sql`${table.mediaId} IS NULL`),
        index(`ix_${mediaTypeName}_tags_user_name_media`).on(table.userId, table.name, table.mediaId),
    ];
};


export const commMediaEpsCols = (modelMediaId: SQLiteColumn) => {
    return {
        id: integer().primaryKey().notNull(),
        mediaId: integer().notNull().references(() => modelMediaId),
        season: integer().notNull(),
        episodes: integer().notNull(),
    };
};


export const commonMediaEpsIndexes = (table: { mediaId: SQLiteColumn; season: SQLiteColumn }, tableName: string) => {
    return [uniqueIndex(`ux_${tableName}_media_season`).on(table.mediaId, table.season)];
};
