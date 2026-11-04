import type {JWTPayload} from "jose";
import {and, asc, eq, gt, sql} from "drizzle-orm";
import {MCP_RESOURCE} from "@/lib/server/core/mcp/config";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {mcpRevocation, oauthAccessToken, oauthClient, oauthConsent, oauthRefreshToken, session, user, verification} from "@/lib/server/database/schema";


// Signature, issuer, audience and expiry are checked by better-auth first
export const getMcpAccess = (accessTokenClaims: JWTPayload) => {
    const userId = Number(accessTokenClaims.sub);
    const clientId = accessTokenClaims.client_id;
    const sessionId = Number(accessTokenClaims.sid);

    if (!Number.isSafeInteger(userId)
        || userId <= 0
        || typeof clientId !== "string"
        || !Number.isSafeInteger(sessionId) || sessionId <= 0
        || typeof accessTokenClaims.mylistsIssuedAt !== "number" || typeof accessTokenClaims.scope !== "string"
    ) return null;

    const grant = getDbClient()
        .select({
            username: user.name,
            scopes: oauthConsent.scopes,
            disabled: oauthClient.disabled,
            resources: oauthConsent.resources,
            revokedAt: mcpRevocation.revokedAt,
        })
        .from(oauthConsent)
        .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
        .innerJoin(user, eq(user.id, oauthConsent.userId))
        .innerJoin(session, and(
            eq(session.id, sessionId),
            gt(session.expiresAt, new Date()),
            eq(session.userId, oauthConsent.userId),
        ))
        .leftJoin(mcpRevocation, and(
            eq(mcpRevocation.userId, oauthConsent.userId),
            eq(mcpRevocation.clientId, oauthConsent.clientId),
        )).where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId)))
        .get();

    if (!grant
        || grant.disabled
        || !grant.resources?.includes(MCP_RESOURCE)
        || (grant.revokedAt !== null && accessTokenClaims.mylistsIssuedAt <= grant.revokedAt)
    ) return null;

    const consentedScopes = new Set(grant.scopes);
    const scopes = new Set(accessTokenClaims.scope.split(" ").filter(scope => consentedScopes.has(scope)));

    return {
        userId,
        scopes,
        username: grant.username,
    };
};


export const getMcpConnectedUsers = () => {
    return getDbClient()
        .selectDistinct({
            id: user.id,
            name: user.name,
            image: user.image,
        })
        .from(oauthConsent)
        .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
        .innerJoin(user, eq(user.id, oauthConsent.userId))
        .where(and(
            sql`COALESCE(${oauthClient.disabled}, 0) = 0`,
            sql`exists (SELECT 1 FROM json_each(${oauthConsent.resources}) WHERE value = ${MCP_RESOURCE})`,
        ))
        .orderBy(asc(user.name))
        .all();
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
