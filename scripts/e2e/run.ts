import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {mkdtemp, rm} from "node:fs/promises";


const directory = await mkdtemp(join(tmpdir(), "mylists-e2e-"));


// Pass only runtime settings: local .env creds and db must never be used
const env = {
    TZ: "UTC",
    CI: process.env.CI,
    LOG_LEVEL: "silent",
    REDIS_ENABLED: "false",
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: "development",
    MYLISTS_E2E_DIR: directory,
    DISPLAY: process.env.DISPLAY,
    XAUTHORITY: process.env.XAUTHORITY,
    ADMIN_PASSWORD: "E2eAdminPassword!",
    VITE_BASE_URL: "http://127.0.0.1:4173",
    ADMIN_LOG_DIR: join(directory, "logs"),
    DATABASE_URL: join(directory, "site.db"),
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
    BASE_UPLOADS_LOCATION: join(directory, "uploads"),
    ADMIN_TOKEN_SECRET: "e2e-admin-token-secret-for-local-tests",
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
    BETTER_AUTH_SECRET: "e2e-auth-secret-for-isolated-browser-tests",
};


let exitCode: number;
try {
    const runner = Bun.spawn(["node", resolve("node_modules/@playwright/test/cli.js"), "test", ...process.argv.slice(2)], {
        env,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    exitCode = await runner.exited;
}
finally {
    await rm(directory, { recursive: true, force: true });
}


process.exit(exitCode);
