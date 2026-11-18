import {ApiProviderType} from "@/lib/utils/enums";
import {integer, snakeCase, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const apiTokens = snakeCase.table("api_tokens", {
    id: integer("id").primaryKey().notNull(),
    provider: text("provider").$type<ApiProviderType>().notNull(),
    accessToken: text("access_token").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
}, (table) => [
    uniqueIndex("api_tokens_provider_unique").on(table.provider),
]);
