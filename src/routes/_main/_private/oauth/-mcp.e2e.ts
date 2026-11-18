import {createHash, randomBytes} from "node:crypto";
import type {APIRequestContext, Page} from "@playwright/test";
import {expect, test, runBun} from "../../../../../scripts/e2e/fixtures";
import {movies, password, users} from "../../../../../scripts/e2e/data";


async function connectAssistant(page: Page, request: APIRequestContext, baseURL: string) {
    const resource = `${baseURL}/api/mcp`;
    const registration = await request.post("/api/auth/oauth2/register", { data: {
        client_name: "Browser test assistant",
        redirect_uris: ["https://assistant.example.invalid/callback"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
    } });
    await expect(registration).toBeOK();
    const { client_id: clientId } = await registration.json();
    const verifier = randomBytes(32).toString("base64url");
    const state = randomBytes(16).toString("hex");
    const query = new URLSearchParams({
        client_id: clientId, redirect_uri: "https://assistant.example.invalid/callback",
        response_type: "code", scope: "mylists:read mylists:write offline_access", resource,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state,
    });
    await page.route("https://assistant.example.invalid/callback**", route => route.fulfill({ body: "Connected" }));
    await page.goto(`${baseURL}/api/auth/oauth2/authorize?${query}`);
    await expect(page.getByText("Connect your MyLists account", { exact: true })).toBeVisible();
    await page.getByLabel("Email", { exact: true }).fill(users.owner.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByText("Connect Browser test assistant to MyLists?", { exact: true })).toBeVisible();
    await page.getByRole("checkbox", {name: "Allow reading only"}).check();
    await page.getByRole("button", { name: "Allow connection", exact: true }).click();
    await expect(page).toHaveURL(/assistant\.example\.invalid\/callback\?/);
    const callback = new URL(page.url());
    expect(callback.searchParams.get("state")).toBe(state);
    const response = await request.post("/api/auth/oauth2/token", { form: {
        grant_type: "authorization_code", client_id: clientId, code: callback.searchParams.get("code")!,
        redirect_uri: "https://assistant.example.invalid/callback", code_verifier: verifier, resource,
    } });
    await expect(response).toBeOK();
    const { access_token: token } = await response.json();
    return token as string;
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
    const token = await connectAssistant(page, request, baseURL!);
    const tools = await rpc(request, token, "tools/list");
    const toolNames = (await tools.json()).result.tools.map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain("query_mylists");
    expect(toolNames).not.toContain("add_media");
    const deniedWrite = await rpc(request, token, "tools/call", {
        name: "add_media", arguments: { mediaType: "movies", mediaId: movies.editable.id },
    });
    expect((await deniedWrite.json()).result.isError).toBe(true);

    const visible = await callTool(request, token, "query_mylists", {
        action: "sql",
        sql: "SELECT profile_id, media_id, rating FROM entries ORDER BY media_id",
    });
    expect(visible.rows).toEqual([[users.owner.id, movies.editable.id, 6], [users.owner.id, movies.private.id, 9]]);

    await page.goto("/settings/connected-apps");
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    await expect(page.getByText("No apps connected", { exact: true })).toBeVisible();
    expect((await rpc(request, token, "tools/list")).status()).toBe(401);
});
