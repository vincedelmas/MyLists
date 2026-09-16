import {createServer} from "vite";
import {mkdir} from "node:fs/promises";


if (!process.env.MYLISTS_E2E_DIR) {
    throw new Error("Start browser tests with bun run test:e2e.");
}


await mkdir(process.env.BASE_UPLOADS_LOCATION!, { recursive: true });
const seed = Bun.spawn([process.execPath, "--no-env-file", "scripts/e2e/database.ts"], { stdout: "inherit", stderr: "inherit" });


if (await seed.exited !== 0) {
    throw new Error("Could not initialize the browser test database.");
}


const server = await createServer({
    // Vite reads dev .env even with Bun --no-env-file
    envDir: process.env.MYLISTS_E2E_DIR,
    server: {
        port: 4173,
        strictPort: true,
        host: "127.0.0.1",
    },
});
await server.listen();


process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
});
