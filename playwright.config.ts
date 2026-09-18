import {defineConfig, devices} from "@playwright/test";


export default defineConfig({
    workers: 2,
    retries: 0,
    timeout: 60_000,
    testDir: "./src",
    fullyParallel: true,
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
    },
});
