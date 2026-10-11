import {createHash, randomBytes} from "node:crypto";
import type {APIRequestContext, Page} from "@playwright/test";
import {expect, test, runBun} from "../../../../../scripts/e2e/fixtures";
import {movies, password, users} from "../../../../../scripts/e2e/data";


async function connectAssistant(page: Page, request: APIRequestContext, baseURL: string, options: { readOnly?: boolean; clientId?: string; signedIn?: boolean } = {}) {
    const resource = `${baseURL}/api/mcp`;
    let clientId = options.clientId;
    if (!clientId) {
        const response = await request.post("/api/auth/oauth2/register", { data: {
            client_name: "Browser test assistant",
            redirect_uris: ["https://assistant.example.invalid/callback"],
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
        } });
        await expect(response).toBeOK();
        clientId = (await response.json()).client_id;
    }
    const verifier = randomBytes(32).toString("base64url");
    const state = randomBytes(16).toString("hex");
    const query = new URLSearchParams({
        client_id: clientId!, redirect_uri: "https://assistant.example.invalid/callback",
        response_type: "code", scope: "mylists:read mylists:write offline_access", resource,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state,
    });
    await page.route("https://assistant.example.invalid/callback**", route => route.fulfill({ body: "Connected" }));
    await page.goto(`${baseURL}/api/auth/oauth2/authorize?${query}`);
    if (!options.signedIn) {
        await expect(page.getByText("Connect your MyLists account", { exact: true })).toBeVisible();
        await page.getByLabel("Email", { exact: true }).fill(users.owner.email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Login", exact: true }).click();
    }
    await expect(page.getByText("Connect Browser test assistant to MyLists?", { exact: true })).toBeVisible();
    if (options.readOnly) await page.getByRole("checkbox", {name: "Allow reading only"}).check();
    await page.getByRole("button", { name: "Allow connection", exact: true }).click();
    await expect(page).toHaveURL(/assistant\.example\.invalid\/callback\?/);
    const callback = new URL(page.url());
    expect(callback.searchParams.get("state")).toBe(state);
    const response = await request.post("/api/auth/oauth2/token", { form: {
        grant_type: "authorization_code", client_id: clientId!, code: callback.searchParams.get("code")!,
        redirect_uri: "https://assistant.example.invalid/callback", code_verifier: verifier, resource,
    } });
    await expect(response).toBeOK();
    return { clientId: clientId!, ...await response.json() } as { clientId: string; access_token: string; refresh_token: string };
}


async function rpc(request: APIRequestContext, token: string, method: string, params = {}) {
    return request.post("/api/mcp", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25" },
        data: { jsonrpc: "2.0", id: 1, method, params },
    });
}

async function callTool(request: APIRequestContext, token: string, name: string, args: Record<string, unknown>) {
    const response = await rpc(request, token, "tools/call", { name, arguments: args });
    await expect(response).toBeOK();
    const body = await response.json();
    expect(body.error).toBeUndefined();
    expect(body.result.isError, JSON.stringify(body.result)).not.toBe(true);
    return body.result.structuredContent.result;
}


test("queries owner-only snapshots with read-only consent and revokes access on disconnect", async ({ page, request, baseURL }) => {
    await runBun(["src/routes/_main/_private/oauth/-fixtures.ts"]);
    const connection = await connectAssistant(page, request, baseURL!, { readOnly: true });
    const token = connection.access_token;
    const tools = await rpc(request, token, "tools/list");
    const toolNames = (await tools.json()).result.tools.map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain("query_mylists");
    expect(toolNames).not.toContain("add_media");
    const deniedWrite = await rpc(request, token, "tools/call", {
        name: "add_media", arguments: { mediaType: "movies", mediaId: movies.editable.id },
    });
    expect((await deniedWrite.json()).result.isError).toBe(true);

    const schema = await callTool(request, token, "query_mylists", { action: "schema" });
    expect(schema).not.toHaveProperty("scope");
    expect(schema.schema).toContain("my_entries");

    const own = await callTool(request, token, "query_mylists", {
        action: "sql",
        sql: "SELECT profile_id, title, rating FROM entries WHERE rating > $minimum ORDER BY profile_id",
        parameters: { minimum: 8 },
    });
    expect(own.columns).toEqual(["profile_id", "title", "rating"]);
    expect(own.rows).toEqual([[users.owner.id, movies.private.name, 9]]);
    expect(own.truncated).toBe(false);
    expect(own.snapshotAt).toBeTruthy();
    expect(own.timings.totalMs).toBeGreaterThanOrEqual(0);

    const formatted = await callTool(request, token, "query_mylists", {
        action: "sql",
        sql: `SELECT e.profile_id, printf('%s: %.1f', e.title, e.rating) AS summary,
                     json_extract($criteria, '$.minimum') AS minimum_rating
              FROM main.my_entries AS e
              JOIN json_each($criteria, '$.media_types') AS requested ON requested.value = e.media_type
              WHERE e.rating > json_extract($criteria, '$.minimum')
              ORDER BY e.profile_id`,
        parameters: { criteria: JSON.stringify({ minimum: 8, media_types: ["movies"] }) },
    });
    expect(formatted.columns).toEqual(["profile_id", "summary", "minimum_rating"]);
    expect(formatted.rows).toEqual([[users.owner.id, `${movies.private.name}: 9.0`, 8]]);

    const visible = await callTool(request, token, "query_mylists", {
        action: "sql",
        sql: "SELECT profile_id, media_id, rating FROM entries ORDER BY media_id",
    });
    expect(visible.rows).toEqual([[users.owner.id, movies.editable.id, 6], [users.owner.id, movies.private.id, 9]]);

    const details = await callTool(request, token, "media_details", { mediaType: "movies", mediaId: movies.private.id });
    expect(details.userMedia).toMatchObject({ userId: users.owner.id, rating: 9 });
    expect(details).not.toHaveProperty("followsData");

    const limited = await callTool(request, token, "query_mylists", {
        action: "sql",
        sql: "SELECT profile_id FROM entries ORDER BY profile_id",
        maxRows: 1,
    });
    expect(limited.rows).toEqual([[users.owner.id]]);
    expect(limited.truncated).toBe(true);

    for (const sql of ["SELECT email FROM user", "SELECT * FROM collections", "SELECT * FROM follow_entries", "DELETE FROM entries", "ATTACH DATABASE ':memory:' AS other"]) {
        const denied = await rpc(request, token, "tools/call", { name: "query_mylists", arguments: { action: "sql", sql } });
        expect((await denied.json()).result.isError).toBe(true);
    }

    for (const extra of [{ userId: users.stranger.id }, { scope: "self" }, { scope: "self_and_follows" }]) {
        const forged = await rpc(request, token, "tools/call", {
            name: "query_mylists",
            arguments: { action: "sql", sql: "SELECT profile_id FROM entries", ...extra },
        });
        expect((await forged.json()).result.isError).toBe(true);
    }

    const unchanged = await callTool(request, token, "query_mylists", { action: "sql", sql: "SELECT rating FROM my_entries ORDER BY media_id" });
    expect(unchanged.rows).toEqual([[6], [9]]);

    await page.goto("/settings/connected-apps");
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    await expect(page.getByText("No apps connected", { exact: true })).toBeVisible();
    expect((await rpc(request, token, "tools/list")).status()).toBe(401);
});
