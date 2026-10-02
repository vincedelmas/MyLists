import {customJson} from "@/lib/server/database/custom-types";
import {session, user} from "@/lib/server/database/schema/auth.schema";
import {index, integer, primaryKey, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const jwks = sqliteTable("jwks", {
    id: integer("id").primaryKey(),
    publicKey: text("public_key").notNull(),
    privateKey: text("private_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    alg: text("alg"),
    crv: text("crv"),
});


export const oauthClient = sqliteTable("oauth_client", {
    id: integer("id").primaryKey(),
    clientId: text("client_id").notNull().unique(),
    clientSecret: text("client_secret"),
    clientDiscoveryId: text("client_discovery_id"),
    disabled: integer("disabled", { mode: "boolean" }).default(false),
    skipConsent: integer("skip_consent", { mode: "boolean" }),
    enableEndSession: integer("enable_end_session", { mode: "boolean" }),
    subjectType: text("subject_type"),
    scopes: customJson<string[]>("scopes", { acceptSerialized: true }),
    clientCredentialsScopes: customJson<string[]>("client_credentials_scopes", { acceptSerialized: true }).default([]),
    userId: integer("user_id").references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
    name: text("name"),
    uri: text("uri"),
    icon: text("icon"),
    contacts: customJson<string[]>("contacts", { acceptSerialized: true }),
    tos: text("tos"),
    policy: text("policy"),
    softwareId: text("software_id"),
    softwareVersion: text("software_version"),
    softwareStatement: text("software_statement"),
    redirectUris: customJson<string[]>("redirect_uris", { acceptSerialized: true }).notNull(),
    postLogoutRedirectUris: customJson<string[]>("post_logout_redirect_uris", { acceptSerialized: true }),
    backchannelLogoutUri: text("backchannel_logout_uri"),
    backchannelLogoutSessionRequired: integer("backchannel_logout_session_required", { mode: "boolean" }),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
    applicationType: text("application_type"),
    jwks: text("jwks"),
    jwksUri: text("jwks_uri"),
    grantTypes: customJson<string[]>("grant_types", { acceptSerialized: true }),
    responseTypes: customJson<string[]>("response_types", { acceptSerialized: true }),
    requirePKCE: integer("require_pkce", { mode: "boolean" }),
    dpopBoundAccessTokens: integer("dpop_bound_access_tokens", { mode: "boolean" }).default(false),
    referenceId: text("reference_id"),
    metadata: customJson<Record<string, unknown>>("metadata", { acceptSerialized: true }),
}, (table) => [
    index("oauthClient_userId_idx").on(table.userId)
]);


export const oauthResource = sqliteTable("oauth_resource", {
    id: integer("id").primaryKey(),
    identifier: text("identifier").notNull().unique(),
    name: text("name").notNull(),
    accessTokenTtl: integer("access_token_ttl"),
    refreshTokenTtl: integer("refresh_token_ttl"),
    signingAlgorithm: text("signing_algorithm"),
    signingKeyId: text("signing_key_id"),
    allowedScopes: customJson<Record<string, unknown>>("allowed_scopes", { acceptSerialized: true }),
    customClaims: customJson<Record<string, unknown>>("custom_claims", { acceptSerialized: true }),
    dpopBoundAccessTokensRequired: integer("dpop_bound_access_tokens_required", { mode: "boolean" }).default(false),
    disabled: integer("disabled", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
    policyVersion: integer("policy_version").default(1),
    metadata: customJson<Record<string, unknown>>("metadata", { acceptSerialized: true }),
});


export const oauthClientResource = sqliteTable("oauth_client_resource", {
    id: integer("id").primaryKey(),
    clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
    resourceId: text("resource_id").notNull().references(() => oauthResource.identifier, { onDelete: "cascade" }),
    metadata: customJson<Record<string, unknown>>("metadata", { acceptSerialized: true }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
}, (table) => [
    index("oauthClientResource_clientId_idx").on(table.clientId),
    index("oauthClientResource_resourceId_idx").on(table.resourceId),
    uniqueIndex("oauthClientResource_clientId_resourceId_uidx").on(table.clientId, table.resourceId),
]);


export const oauthRefreshToken = sqliteTable("oauth_refresh_token", {
    id: integer("id").primaryKey(),
    token: text("token").notNull().unique(),
    clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: integer("session_id").references(() => session.id, { onDelete: "set null" }),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: customJson<string[]>("resources", { acceptSerialized: true }),
    requestedUserInfoClaims: customJson<string[]>("requested_user_info_claims", { acceptSerialized: true }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    revoked: integer("revoked", { mode: "timestamp_ms" }),
    rotatedAt: integer("rotated_at", { mode: "timestamp_ms" }),
    rotationReplayResponse: text("rotation_replay_response"),
    rotationReplayExpiresAt: integer("rotation_replay_expires_at", { mode: "timestamp_ms" }),
    authTime: integer("auth_time", { mode: "timestamp_ms" }),
    confirmation: customJson<Record<string, unknown>>("confirmation", { acceptSerialized: true }),
    scopes: customJson<string[]>("scopes", { acceptSerialized: true }).notNull(),
}, (table) => [
    index("oauthRefreshToken_userId_idx").on(table.userId),
    index("oauthRefreshToken_clientId_idx").on(table.clientId),
    index("oauthRefreshToken_sessionId_idx").on(table.sessionId),
    index("oauthRefreshToken_authorizationCodeId_idx").on(table.authorizationCodeId),
]);


export const oauthAccessToken = sqliteTable("oauth_access_token", {
    id: integer("id").primaryKey(),
    token: text("token").notNull().unique(),
    clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: integer("session_id").references(() => session.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: customJson<string[]>("resources", { acceptSerialized: true }),
    requestedUserInfoClaims: customJson<string[]>("requested_user_info_claims", { acceptSerialized: true }),
    refreshId: integer("refresh_id").references(() => oauthRefreshToken.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    revoked: integer("revoked", { mode: "timestamp_ms" }),
    confirmation: customJson<Record<string, unknown>>("confirmation", { acceptSerialized: true }),
    scopes: customJson<string[]>("scopes", { acceptSerialized: true }).notNull(),
}, (table) => [
    index("oauthAccessToken_userId_idx").on(table.userId),
    index("oauthAccessToken_clientId_idx").on(table.clientId),
    index("oauthAccessToken_sessionId_idx").on(table.sessionId),
    index("oauthAccessToken_refreshId_idx").on(table.refreshId),
    index("oauthAccessToken_authorizationCodeId_idx").on(table.authorizationCodeId),
]);


export const oauthConsent = sqliteTable("oauth_consent", {
    id: integer("id").primaryKey(),
    clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    resources: customJson<string[]>("resources", { acceptSerialized: true }),
    requestedUserInfoClaims: customJson<string[]>("requested_user_info_claims", { acceptSerialized: true }),
    scopes: customJson<string[]>("scopes", { acceptSerialized: true }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
    index("oauthConsent_clientId_idx").on(table.clientId),
    index("oauthConsent_userId_idx").on(table.userId),
]);


export const oauthClientAssertion = sqliteTable("oauth_client_assertion", {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});


export const mcpRevocation = sqliteTable("mcp_revocation", {
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
    revokedAt: integer("revoked_at").notNull(),
}, (table) => [
    primaryKey({ columns: [table.userId, table.clientId] }),
]);
