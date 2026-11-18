import {MediaType} from "@/lib/utils/enums";
import {user} from "@/lib/server/database/schema/auth.schema";
import {integer, snakeCase, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const mediaTags = snakeCase.table("media_tags", {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaType: text().$type<MediaType>().notNull(),
    name: text().notNull(),
}, table => [uniqueIndex("ux_media_tags_user_type_name").on(table.userId, table.mediaType, table.name)]);
