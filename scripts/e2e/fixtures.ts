import {join} from "node:path";
import {once} from "node:events";
import {promisify} from "node:util";
import {password, users} from "./data";
import {execFile, spawn} from "node:child_process";
import {expect, type Page, test as base} from "@playwright/test";


const execFileAsync = promisify(execFile);


export const runBun = (args: string[]) => {
    return execFileAsync("bun", ["--no-env-file", ...args]);
}


export const test = base.extend<{ resetDatabase: void }, { e2eServer: string }>({
    e2eServer: [async ({}, runTests, workerInfo) => {
        const baseURL = `http://127.0.0.1:${4173 + workerInfo.workerIndex}`;
        const directory = join(process.env.MYLISTS_E2E_DIR!, `worker-${workerInfo.workerIndex}`);

        // Each Playwright worker is a process. Its fixture commands and server inherit same isolated db, uploads and origin.
        Object.assign(process.env, {
            VITE_BASE_URL: baseURL,
            MYLISTS_E2E_DIR: directory,
            ADMIN_LOG_DIR: join(directory, "logs"),
            DATABASE_URL: join(directory, "site.db"),
            BASE_UPLOADS_LOCATION: join(directory, "uploads"),
        });

        const server = spawn("bun", ["--no-env-file", "scripts/e2e/server.ts"], {
            stdio: ["ignore", "inherit", "inherit", "ipc"],
        });

        try {
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("E2E server startup timed out")), 120_000);
                server.once("message", () => {
                    clearTimeout(timeout);
                    resolve();
                });
                server.once("error", error => {
                    clearTimeout(timeout);
                    reject(error);
                });
                server.once("exit", code => {
                    clearTimeout(timeout);
                    reject(new Error(`E2E server exited before startup (code ${code})`));
                });
            });
            await runTests(baseURL);
        }
        finally {
            if (server.exitCode === null && server.signalCode === null) {
                const exited = once(server, "exit");
                server.kill("SIGTERM");
                const timeout = setTimeout(() => server.kill("SIGKILL"), 5_000);
                await exited;
                clearTimeout(timeout);
            }
        }
    }, { scope: "worker", timeout: 130_000 }],
    baseURL: async ({ e2eServer }, runTests) => {
        await runTests(e2eServer);
    },
    resetDatabase: [async ({ e2eServer }, runTests) => {
        // Depend on server startup before resetting this worker's database.
        void e2eServer;
        await runBun(["scripts/e2e/database.ts"]);
        await runTests();
    }, { auto: true }],
});


export {expect};


export async function signIn(page: Page, account: keyof typeof users = "owner") {
    // Request shares browser context's cookies, UI login has its own E2E.
    const response = await page.request.post("/api/auth/sign-in/email", {
        headers: { Origin: process.env.VITE_BASE_URL! },
        data: { email: users[account].email, password },
    });

    await expect(response).toBeOK();
}
