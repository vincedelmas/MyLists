import type {JWTPayload} from "jose";
import {and, eq, gt, sql} from "drizzle-orm";
import {MCP_RESOURCE} from "@/lib/server/core/mcp/config";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {mcpRevocation, oauthAccessToken, oauthClient, oauthConsent, oauthRefreshToken, session, user, verification} from "@/lib/server/database/schema";


// Signature, issuer, audience and expiry are checked by requireMcpAuth first.
// Live grants and sessions also prevent disconnected clients from reusing JWTs.
export const getMcpAccess = (claims: JWTPayload) => {
    const userId = Number(claims.sub);
    const clientId = claims.client_id;
    const sessionId = Number(claims.sid);

    if (!Number.isSafeInteger(userId)
        || userId <= 0
        || typeof clientId !== "string"
        || !Number.isSafeInteger(sessionId) || sessionId <= 0
        || typeof claims.mylistsIssuedAt !== "number" || typeof claims.scope !== "string"
    ) return null;

    const db = getDbClient();

    const grant = db
        .select({
            username: user.name,
            scopes: oauthConsent.scopes,
            disabled: oauthClient.disabled,
            resources: oauthConsent.resources,
        })
        .from(oauthConsent)
        .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
        .innerJoin(user, eq(user.id, oauthConsent.userId))
        .where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId)))
        .get();

    const liveSession = db
        .select({ id: session.id })
        .from(session)
        .where(and(
            eq(session.id, sessionId),
            eq(session.userId, userId),
            gt(session.expiresAt, new Date()),
        )).get();

    const revoked = db
        .select()
        .from(mcpRevocation)
        .where(and(eq(mcpRevocation.userId, userId), eq(mcpRevocation.clientId, clientId)))
        .get();

    if (!grant
        || grant.disabled
        || !grant.resources?.includes(MCP_RESOURCE)
        || !liveSession
        || (revoked && claims.mylistsIssuedAt <= revoked.revokedAt)
    ) return null;

    const consentedScopes = new Set(grant.scopes);
    const scopes = new Set(claims.scope.split(" ").filter(scope => consentedScopes.has(scope)));

    return { userId, username: grant.username, scopes };
};


export const getMcpConnections = (userId: number) => {
    return getDbClient()
        .select({
            name: oauthClient.name,
            scopes: oauthConsent.scopes,
            clientId: oauthConsent.clientId,
            createdAt: oauthConsent.createdAt,
        })
        .from(oauthConsent)
        .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
        .where(eq(oauthConsent.userId, userId))
        .all();
}


export const revokeMcpConnection = (userId: number, clientId: string) => {
    withTransaction(() => {
        const db = getDbClient();

        const grant = db
            .select({ id: oauthConsent.id })
            .from(oauthConsent)
            .where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId)))
            .get();

        if (!grant) return;

        const revokedAt = Date.now();

        db.insert(mcpRevocation)
            .values({ userId, clientId, revokedAt })
            .onConflictDoUpdate({
                target: [mcpRevocation.userId, mcpRevocation.clientId],
                set: { revokedAt },
            }).run();

        db.delete(oauthAccessToken)
            .where(and(eq(oauthAccessToken.userId, userId), eq(oauthAccessToken.clientId, clientId)))
            .run();

        db.delete(oauthRefreshToken)
            .where(and(eq(oauthRefreshToken.userId, userId), eq(oauthRefreshToken.clientId, clientId)))
            .run();

        const authorization = sql`CASE WHEN json_valid(${verification.value}) THEN ${verification.value} ELSE '{}' END`;
        db.delete(verification)
            .where(and(
                sql`json_extract(${authorization}, '$.type') = 'authorization_code'`,
                sql`CAST(json_extract(${authorization}, '$.userId') AS TEXT) = ${String(userId)}`,
                sql`json_extract(${authorization}, '$.query.client_id') = ${clientId}`,
            )).run();

        db.delete(oauthConsent)
            .where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId)))
            .run();
    });
};
