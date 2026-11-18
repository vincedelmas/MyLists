import {serverEnv} from "@/env/server";
import {defineConfig} from "drizzle-kit";


export default defineConfig({
    verbose: true,
    out: "./drizzle",
    dialect: "sqlite",
    breakpoints: true,
    schema: "./src/lib/server/database/schema/index.ts",
    dbCredentials: {
        url: serverEnv.DATABASE_URL,
    },
});
