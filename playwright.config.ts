import {defineConfig, devices} from "@playwright/test";


export default defineConfig({
    workers: 1,
    retries: 0,
    timeout: 60_000,
    testDir: "./src",
    fullyParallel: false,
    testMatch: "**/*.e2e.ts",
    expect: { timeout: 10_000 },
    forbidOnly: !!process.env.CI,
    reporter: [["list"], ["html", { open: "never" }]],
    projects: [{
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
    }],
    use: {
        timezoneId: "UTC",
        actionTimeout: 15_000,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        baseURL: "http://127.0.0.1:4173",
    },
    webServer: {
        timeout: 120_000,
        reuseExistingServer: false,
        url: "http://127.0.0.1:4173/login",
        command: "bun --no-env-file scripts/e2e/server.ts",
        gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
});
