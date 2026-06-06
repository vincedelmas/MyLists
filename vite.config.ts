import path from "path";
import {defineConfig} from "vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import {tanstackStart} from "@tanstack/react-start/plugin/vite";
import react, {reactCompilerPreset} from "@vitejs/plugin-react";
import {reactClickToComponent} from "vite-plugin-react-click-to-component";


export default defineConfig({
    resolve: {
        tsconfigPaths: true,
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (
                        id.includes("/node_modules/react/") ||
                        id.includes("/node_modules/react-dom/") ||
                        id.includes("/node_modules/scheduler/")
                    ) {
                        return "react";
                    }

                    if (
                        id.includes("/node_modules/@tanstack/react-router") ||
                        id.includes("/node_modules/@tanstack/router-core") ||
                        id.includes("/node_modules/@tanstack/history")
                    ) {
                        return "tanstack-router";
                    }

                    if (
                        id.includes("/node_modules/@tanstack/react-query") ||
                        id.includes("/node_modules/@tanstack/query-core")
                    ) {
                        return "tanstack-query";
                    }

                    if (id.includes("/node_modules/recharts")) {
                        return "charts";
                    }

                    if (id.includes("/node_modules/posthog-js")) {
                        return "analytics";
                    }

                    if (
                        id.includes("/node_modules/lucide-react") ||
                        id.includes("/node_modules/react-icons")
                    ) {
                        return "icons";
                    }

                    if (
                        id.includes("/node_modules/@radix-ui/") ||
                        id.includes("/node_modules/radix-ui/")
                    ) {
                        return "radix-ui";
                    }
                },
            },
        },
    },
    plugins: [
        tanstackStart({
            prerender: {
                failOnError: false,
                retryCount: 3,
                retryDelay: 500,
            },
            spa: {
                enabled: true,
            },
            router: {
                semicolons: true,
                quoteStyle: "double",
                codeSplittingOptions: {
                    defaultBehavior: [
                        [
                            "component",
                            "pendingComponent",
                            "errorComponent",
                            "notFoundComponent",
                            "loader",
                        ],
                    ],
                },
            },
        }),
        react(),
        reactClickToComponent(),
        babel({ presets: [reactCompilerPreset()] }),
        tailwindcss(),
    ],
})
