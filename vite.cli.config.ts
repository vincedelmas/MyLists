import path from "path";
import {defineConfig} from "vite";


export default defineConfig({
    resolve: {
        tsconfigPaths: true,
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        minify: false,
        target: "esnext",
        emptyOutDir: true,
        outDir: "dist/cli",
        copyPublicDir: false,
        ssr: "src/cli/index.ts",
    },
})
