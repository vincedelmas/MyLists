import {sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {user} from "@/lib/server/database/schema/auth.schema";
import {customJson} from "@/lib/server/database/custom-types";
import {index, integer, primaryKey, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {catalogItem} from "@/lib/server/database/schema/catalog.schema";


export const whichCameFirstMedia = sqliteTable("which_came_first_media", {
    mediaId: integer().notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    releaseDate: text().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
}, (table) => [
    primaryKey({ columns: [table.mediaType, table.mediaId] }),
    index("ix_wcf_media_type_release_date").on(table.mediaType, table.releaseDate),
]);


export const whichCameFirstRuns = sqliteTable("which_came_first_runs", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    completedAt: text(),
    score: integer().default(0).notNull(),
    startedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    selectedMediaTypes: customJson<MediaType[]>("selected_media_types").notNull(),
    status: text().$type<"active" | "won" | "exhausted" | "lost" | "abandoned">().default("active").notNull(),
}, (table) => [
    index("ix_wcf_runs_user_status").on(table.userId, table.status),
    index("ix_wcf_runs_user_completed").on(table.userId, table.completedAt),
]);


export const whichCameFirstRounds = sqliteTable("which_came_first_rounds", {
    id: integer().primaryKey().notNull(),
    runId: integer().notNull().references(() => whichCameFirstRuns.id, { onDelete: "cascade" }),
    roundNumber: integer().notNull(),
    leftMediaId: integer().notNull().references(() => catalogItem.id, { onDelete: "restrict" }),
    leftReleaseDate: text().notNull(),
    rightMediaId: integer().notNull().references(() => catalogItem.id, { onDelete: "restrict" }),
    rightReleaseDate: text().notNull(),
    correct: integer({ mode: "boolean" }),
    selectedSide: text().$type<"left" | "right">(),
    leftMediaType: text().$type<MediaType>().notNull(),
    rightMediaType: text().$type<MediaType>().notNull(),
    answeredAt: text(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_wcf_round_run_answered").on(table.runId, table.answeredAt),
    uniqueIndex("uq_wcf_round_run_number").on(table.runId, table.roundNumber),
]);
