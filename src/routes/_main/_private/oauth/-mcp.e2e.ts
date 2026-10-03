import {createHash, randomBytes} from "node:crypto";
import type {APIRequestContext, Page} from "@playwright/test";
import {expect, test, runBun} from "../../../../../scripts/e2e/fixtures";
import {movies, password, users} from "../../../../../scripts/e2e/data";


const readToolNames = [
    "media_details", "tv_seasons", "game_platforms", "media_history",
    "search_catalog", "game_search_options", "search_my_list", "my_list_filters",
    "search_my_list_filters", "my_tags", "query_mylists",
];

const writeToolNames = [
    "resolve_catalog_media", "add_media", "update_media", "edit_media_tag", "update_media_cover",
];


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


test("discovers OAuth, signs in, and tracks only the connected user's movies and seasons", async ({ page, request, baseURL }) => {
    const unauthorized = await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
    expect(unauthorized.status()).toBe(401);
    expect(unauthorized.headers()["www-authenticate"]).toContain("resource_metadata");
    expect(unauthorized.headers()["www-authenticate"]).toContain("mylists:write");
    const resourceMetadata = await request.get("/.well-known/oauth-protected-resource");
    await expect(resourceMetadata).toBeOK();
    expect(await resourceMetadata.json()).toMatchObject({ resource: `${baseURL}/api/mcp`, authorization_servers: [`${baseURL}/api/auth`] });
    const discovery = await request.get("/.well-known/oauth-authorization-server/api/auth");
    await expect(discovery).toBeOK();
    expect(await discovery.json()).toMatchObject({ code_challenge_methods_supported: ["S256"] });

    const connection = await connectAssistant(page, request, baseURL!);
    const initialize = await rpc(request, connection.access_token, "initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1.0" } });
    await expect(initialize).toBeOK();
    expect((await initialize.json()).result.serverInfo.name).toBe("MyLists");
    const list = await rpc(request, connection.access_token, "tools/list");
    await expect(list).toBeOK();
    expect((await list.json()).result.tools.map((tool: { name: string }) => tool.name)).toContain("update_media");

    const movie = { mediaType: "movies", mediaId: movies.editable.id };
    await callTool(request, connection.access_token, "add_media", { ...movie, status: "Completed" });
    await callTool(request, connection.access_token, "update_media", { ...movie, payload: { type: "rating", rating: 8 } });
    await callTool(request, connection.access_token, "update_media", { ...movie, payload: { type: "redo", redo: 1 } });
    await callTool(request, connection.access_token, "update_media", { ...movie, payload: { type: "redo", redo: 1 } });
    const entry = await callTool(request, connection.access_token, "media_details", movie);
    expect(entry.userMedia).toMatchObject({ userId: users.owner.id, rating: 8, redo: 1, total: 2 });
    await page.goto(`/details/movies/${movies.editable.id}`);
    const browserUpdate = await page.evaluate(async mediaId => {
        const modulePath = "/src/lib/server/functions/user-media.ts";
        const { postUpdateUserMedia } = await import(modulePath);
        return postUpdateUserMedia({ data: { mediaType: "movies", mediaId, payload: { type: "comment", comment: "Updated from the website" } } });
    }, movies.editable.id);
    expect(browserUpdate.userMedia.comment).toBe("Updated from the website");
    expect((await callTool(request, connection.access_token, "media_details", movie)).userMedia.comment).toBe("Updated from the website");

    const dbState = await runBun(["src/routes/_main/_private/oauth/-fixtures.ts", "movie-state"]);
    expect(JSON.parse(dbState.stdout)).toMatchObject({ otherUserEntries: 0, totalEntries: 2, timeSpent: 200 });

    await runBun(["src/routes/_main/_private/oauth/-fixtures.ts", "seed-series"]);
    const series = { mediaType: "series", mediaId: 901 };
    await callTool(request, connection.access_token, "add_media", { ...series, status: "Completed" });
    await callTool(request, connection.access_token, "update_media", { ...series, payload: { type: "redo", seasonRedos: [{ season: 1, redo: 1 }] } });
    await callTool(request, connection.access_token, "update_media", { ...series, payload: { type: "redo", seasonRedos: [{ season: 1, redo: 1 }] } });
    await callTool(request, connection.access_token, "update_media", { ...series, payload: { type: "rating", seasonRating: { season: 1, rating: 9 } } });
    const seasons = await callTool(request, connection.access_token, "tv_seasons", series);
    expect(seasons).toEqual(expect.arrayContaining([expect.objectContaining({ season: 1, redo: 1, rating: 9 }), expect.objectContaining({ season: 2, redo: 0 })]));

    const forged = await rpc(request, connection.access_token, "tools/call", { name: "update_media", arguments: { ...movie, payload: { type: "rating", rating: 2 }, userId: users.stranger.id } });
    expect((await forged.json()).result.isError).toBe(true);
});


test("read-only consent exposes read tools and rejects write calls", async ({ page, request, baseURL }) => {
    const connection = await connectAssistant(page, request, baseURL!, { readOnly: true });
    const list = await rpc(request, connection.access_token, "tools/list");
    await expect(list).toBeOK();
    const toolList = await list.json();
    expect(toolList.error, JSON.stringify(toolList)).toBeUndefined();
    expect(toolList.result, JSON.stringify(toolList)).toBeDefined();
    expect(toolList.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([...readToolNames].sort());
    const write = await rpc(request, connection.access_token, "tools/call", { name: "add_media", arguments: { mediaType: "movies", mediaId: movies.editable.id } });
    expect((await write.json()).result.isError).toBe(true);
    const result = await callTool(request, connection.access_token, "media_details", { mediaType: "movies", mediaId: movies.editable.id });
    expect(result.userMedia).toBeNull();
});


test("queries scoped media snapshots with read-only consent", async ({ page, request, baseURL }) => {
    await runBun(["src/routes/_main/_private/oauth/-fixtures.ts", "seed-query"]);
    const connection = await connectAssistant(page, request, baseURL!, { readOnly: true });
    const token = connection.access_token;
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
});


test("disconnect revokes access and refresh tokens; reconnect does not revive the old token", async ({ page, request, baseURL }) => {
    const connection = await connectAssistant(page, request, baseURL!);
    const refresh = await request.post("/api/auth/oauth2/token", { form: { grant_type: "refresh_token", client_id: connection.clientId, refresh_token: connection.refresh_token, resource: `${baseURL}/api/mcp` } });
    await expect(refresh).toBeOK();
    const refreshed = await refresh.json();
    await page.goto("/settings/connected-apps");
    await expect(page.getByText("Browser test assistant", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    await expect(page.getByText("No apps connected", { exact: true })).toBeVisible();
    expect((await rpc(request, connection.access_token, "tools/list")).status()).toBe(401);
    expect((await rpc(request, refreshed.access_token, "tools/list")).status()).toBe(401);
    const deniedRefresh = await request.post("/api/auth/oauth2/token", { form: { grant_type: "refresh_token", client_id: connection.clientId, refresh_token: refreshed.refresh_token, resource: `${baseURL}/api/mcp` } });
    expect(deniedRefresh.status()).toBe(400);
    const reconnected = await connectAssistant(page, request, baseURL!, { clientId: connection.clientId, signedIn: true });
    await expect(await rpc(request, reconnected.access_token, "tools/list")).toBeOK();
    expect((await rpc(request, connection.access_token, "tools/list")).status()).toBe(401);
});


test("exposes individual website operations, full list filters and entry tags", async ({ page, request, baseURL }) => {
    await runBun(["src/routes/_main/_private/oauth/-fixtures.ts", "seed-media"]);
    const connection = await connectAssistant(page, request, baseURL!);
    const token = connection.access_token;
    const book = { mediaType: "books", mediaId: 902 };
    const unlistedTag = await rpc(request, token, "tools/call", {
        name: "edit_media_tag", arguments: { ...book, action: "add", tag: { name: "phantom" } },
    });
    const unlistedResult = (await unlistedTag.json()).result;
    expect(unlistedResult.isError).toBe(true);
    expect(unlistedResult.content[0].text).toContain("not in your list");
    expect(await callTool(request, token, "my_tags", { mediaType: "books" })).not.toContainEqual({ name: "phantom" });
    const added = await callTool(request, token, "add_media", book);
    expect(added).toMatchObject({ mediaId: 902, userId: users.owner.id });
    for (const payload of [
        { type: "status", status: "Reading" }, { type: "page", actualPage: 50 },
        { type: "rating", rating: 9 }, { type: "favorite", favorite: true },
        { type: "comment", comment: "Recommended" },
    ]) {
        const result = await callTool(request, token, "update_media", { ...book, payload });
        expect(result.kind).toBe("saved");
    }
    await callTool(request, token, "edit_media_tag", { ...book, action: "add", tag: { name: "summer" } });
    const found = await callTool(request, token, "search_my_list", { mediaType: "books", args: {
        search: "MCP", tags: ["summer"], genres: ["Fantasy"], authors: ["MCP Author"], langs: ["en"],
        status: ["Reading"], favorite: true, comment: true, perPage: 1,
    } });
    expect(found.results.items).toHaveLength(1);
    expect(found.results.items[0]).toMatchObject({ mediaId: 902, rating: 9, actualPage: 50 });
    expect(found.results.pagination).toMatchObject({ totalItems: 1, perPage: 1 });
    expect(found.userData.id).toBe(users.owner.id);
    expect(found.results.pagination.availableSorting).toContain("Recently Modified");
    const filters = await callTool(request, token, "my_list_filters", { mediaType: "books" });
    const authorFilters = await callTool(request, token, "search_my_list_filters", { mediaType: "books", job: "creator", query: "MCP" });
    expect(authorFilters).toEqual([{ name: "MCP Author" }]);
    expect(filters.tags).toEqual(expect.arrayContaining([{ name: "summer" }]));
    expect(await callTool(request, token, "my_tags", { mediaType: "books" })).toEqual(expect.arrayContaining([{ name: "summer" }]));

    const failed = await rpc(request, token, "tools/call", { name: "update_media", arguments: { ...book, payload: { type: "page", actualPage: 201 } } });
    expect((await failed.json()).result.isError).toBe(true);
    const bookState = await callTool(request, token, "media_details", book);
    expect(bookState.userMedia).toMatchObject({ rating: 9, actualPage: 50, tags: [{ name: "summer" }] });
    expect((await callTool(request, token, "media_history", book)).length).toBeGreaterThan(0);
    const wrongType = await rpc(request, token, "tools/call", { name: "update_media", arguments: { ...book, payload: { type: "chapter", currentChapter: 1 } } });
    expect((await wrongType.json()).result.isError).toBe(true);
    for (const payload of [{ type: "rating", rating: null }, { type: "comment", comment: null }]) {
        await callTool(request, token, "update_media", { ...book, payload });
    }
    expect(await callTool(request, token, "edit_media_tag", { ...book, action: "deleteOne", tag: { name: "summer" } })).toBeNull();
    expect((await callTool(request, token, "media_details", book)).userMedia).toMatchObject({ rating: null, comment: null, tags: [] });

    for (const arguments_ of [
        { ...book, action: "rename", tag: { name: "new", oldName: "summer" } },
        { ...book, action: "deleteAll", tag: { name: "summer" } },
        { mediaType: "books", action: "add", tag: { name: "summer" } },
    ]) {
        const denied = await rpc(request, token, "tools/call", { name: "edit_media_tag", arguments: arguments_ });
        expect((await denied.json()).result.isError).toBe(true);
    }
    for (const arguments_ of [
        { mediaType: "books", username: users.stranger.name, args: {} },
        { mediaType: "books", args: { userId: users.stranger.id } },
        { mediaType: "books", args: { currentUserId: users.stranger.id } },
    ]) {
        const denied = await rpc(request, token, "tools/call", { name: "search_my_list", arguments: arguments_ });
        expect((await denied.json()).result.isError).toBe(true);
    }

    const cases = [
        { mediaType: "manga", mediaId: 903, payloads: [{ type: "chapter", currentChapter: 10 }], state: { currentChapter: 10 } },
        { mediaType: "games", mediaId: 904, payloads: [{ type: "playtime", playtime: 90 }, { type: "platform", platform: "PC" }], state: { playtime: 90, platform: "PC" } },
        { mediaType: "anime", mediaId: 905, payloads: [{ type: "tv", currentSeason: 1, currentEpisode: 2 }], state: { currentSeason: 1, currentEpisode: 2 } },
    ];
    for (const { mediaType, mediaId, payloads, state } of cases) {
        const ref = { mediaType, mediaId };
        await callTool(request, token, "add_media", ref);
        for (const payload of payloads) await callTool(request, token, "update_media", { ...ref, payload });
        expect((await callTool(request, token, "media_details", ref)).userMedia).toMatchObject(state);
    }
    const tools = (await (await rpc(request, token, "tools/list")).json()).result.tools;
    expect(tools.map((tool: { name: string }) => tool.name).sort()).toEqual([...readToolNames, ...writeToolNames].sort());
});


test("keeps collection operations outside MCP", async ({ page, request, baseURL }) => {
    const connection = await connectAssistant(page, request, baseURL!);
    const token = connection.access_token;
    const list = await rpc(request, token, "tools/list");
    const tools = (await list.json()).result.tools;
    expect(tools.map((tool: { name: string }) => tool.name).sort()).toEqual([...readToolNames, ...writeToolNames].sort());
    expect(tools.find((tool: { name: string }) => tool.name === "update_media").inputSchema.properties).not.toHaveProperty("addToCollections");

    for (const name of ["search_collections", "get_collection", "create_collection", "update_collection"]) {
        const response = await rpc(request, token, "tools/call", { name, arguments: {} });
        expect((await response.json()).result.isError).toBe(true);
    }

    const movie = { mediaType: "movies", mediaId: movies.editable.id };
    await callTool(request, token, "add_media", movie);
    await callTool(request, token, "update_media", { ...movie, payload: { type: "rating", rating: 8 } });
    const rejected = await rpc(request, token, "tools/call", {
        name: "update_media", arguments: { ...movie, payload: { type: "rating", rating: 2 }, addToCollections: [1] },
    });
    expect((await rejected.json()).result.isError).toBe(true);
    const details = await callTool(request, token, "media_details", movie);
    expect(details).not.toHaveProperty("collections");
    expect(details.userMedia.rating).toBe(8);
});
