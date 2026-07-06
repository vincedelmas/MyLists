import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {customJson} from "@/lib/server/database/custom-types";
import {user} from "@/lib/server/database/schema/auth.schema";
import {index, integer, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {ApiProviderType, ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";


export const importJobs = sqliteTable("import_jobs", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    error: text("error"),
    source: text("source").$type<ImportSource>().notNull(),
    totalCount: integer("total_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    skippedCount: integer("skipped_count").default(0).notNull(),
    completedCount: integer("completed_count").default(0).notNull(),
    processedCount: integer("processed_count").default(0).notNull(),
    status: text("status").$type<ImportJobStatus>().default(ImportJobStatus.PARSING).notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
}, (table) => [
    index("ix_import_jobs_user_created_at").on(table.userId, table.createdAt),
    index("ix_import_jobs_status_created_at").on(table.status, table.createdAt),
]);


export const importItems = sqliteTable("import_items", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    jobId: integer("job_id").notNull().references(() => importJobs.id, { onDelete: "cascade" }),
    name: text("name"),
    releaseDate: text("release_date"),
    statusReason: text("status_reason"),
    externalApiId: text("external_api_id"),
    rowNumber: integer("row_number").notNull(),
    matchedMediaId: integer("matched_media_id"),
    mediaType: text("media_type").$type<MediaType>(),
    payload: customJson<Record<string, any>>("payload_json").notNull(),
    externalApiSource: text("external_api_source").$type<ApiProviderType>(),
    status: text("status").$type<ImportItemStatus>().default(ImportItemStatus.QUEUED).notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_import_items_job_status_media_type").on(table.jobId, table.status, table.mediaType),
    uniqueIndex("ux_import_items_job_row").on(table.jobId, table.rowNumber),
]);


export const importJobsRelations = relations(importJobs, ({ many, one }) => ({
    user: one(user, {
        fields: [importJobs.userId],
        references: [user.id],
    }),
    items: many(importItems),
}));


export const importItemsRelations = relations(importItems, ({ one }) => ({
    job: one(importJobs, {
        fields: [importItems.jobId],
        references: [importJobs.id],
    }),
}));
