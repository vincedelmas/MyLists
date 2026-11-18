import {defineConfig} from "vitest/config";


export default defineConfig({
    test: {
        // Vitest's fork watchdog uses IPC method, Bun has not implemented it.
        pool: "threads",
        include: ["src/**/*.test.{ts,tsx}"],
    },
    resolve: {
        alias: {
            "@": new URL("./src", import.meta.url).pathname,
        },
    },
});
