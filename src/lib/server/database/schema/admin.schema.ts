import {sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {relations} from "drizzle-orm/relations";
import {TaskResult} from "@/lib/types/tasks.types";
import {user} from "@/lib/server/database/schema/auth.schema";
import {index, integer, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {customJson, dateAsString} from "@/lib/server/database/custom-types";


export const taskHistory = sqliteTable("task_history", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    taskId: text("task_id").notNull(),
    userId: integer("user_id").references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    taskName: text("task_name").notNull(),
    triggeredBy: text("triggered_by").notNull(),
    logs: customJson<TaskResult>("logs").notNull(),
    startedAt: dateAsString("started_at").notNull(),
    finishedAt: dateAsString("finished_at").notNull(),
}, (table) => [
    index("ix_task_history_task_id").on(table.taskId),
    index("ix_task_history_status").on(table.status),
    index("ix_task_history_user_id").on(table.userId),
]);


export const inactiveAccountDeletion = sqliteTable("inactive_account_deletion", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    deletedAt: text("deleted_at"),
    userId: integer("user_id").notNull(),
    username: text("username").notNull(),
    resurrectedAt: text("resurrected_at"),
    warningSentAt: text("warning_sent_at"),
    lastEmailError: text("last_email_error"),
    lastSeenAt: text("last_seen_at").notNull(),
    warningTokenHash: text("warning_token_hash"),
    lastEmailAttemptAt: text("last_email_attempt_at"),
    deletionScheduledAt: text("deletion_scheduled_at").notNull(),
    status: text("status").$type<"warned" | "resurrected" | "deleted" | "mail_failed">().notNull(),
    emailRetryCount: integer("email_retry_count").default(0).notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_inactive_account_deletion_user_id").on(table.userId),
    index("ix_inactive_account_deletion_status").on(table.status),
    index("ix_inactive_account_deletion_deletion_scheduled_at").on(table.deletionScheduledAt),
    uniqueIndex("ux_inactive_account_deletion_warning_token_hash").on(table.warningTokenHash),
]);


export const taskHistoryRelations = relations(taskHistory, ({ one }) => ({
    user: one(user, {
        fields: [taskHistory.userId],
        references: [user.id]
    }),
}));


export const mediaRefreshLog = sqliteTable("media_refresh_log", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    apiId: text("api_id").notNull(),
    refreshedAt: text("refreshed_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_media_refresh_log_user_id").on(table.userId),
    index("ix_media_refresh_log_refreshed_at").on(table.refreshedAt),
    index("ix_media_refresh_log_media_type").on(table.mediaType),
]);


export const mediaRefreshLogRelations = relations(mediaRefreshLog, ({ one }) => ({
    user: one(user, {
        references: [user.id],
        fields: [mediaRefreshLog.userId],
    }),
}));


export const apiCallRollup = sqliteTable("api_call_rollup", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    provider: text("provider").notNull(),
    bucketStartMs: integer("bucket_start_ms").notNull(),
    bucketStart: text("bucket_start").notNull(),
    total: integer("total").notNull(),
    errors: integer("errors").notNull(),
    durationMsTotal: integer("duration_ms_total").notNull(),
    maxSecondBurst: integer("max_second_burst").notNull(),
    statusCounts: customJson<Record<string, number>>("status_counts").notNull(),
}, (table) => [
    index("ix_api_call_rollup_provider").on(table.provider),
    index("ix_api_call_rollup_bucket_start_ms").on(table.bucketStartMs),
    index("ix_api_call_rollup_bucket_start").on(table.bucketStart),
    uniqueIndex("ux_api_call_rollup_bucket_provider").on(table.bucketStartMs, table.provider),
]);
