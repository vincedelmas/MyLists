import {describe, expect, it} from "vitest";
import {getDisabledOptionalIntegrations} from "@/env/server";


describe("getDisabledOptionalIntegrations", () => {
    it("lists each disabled feature with the env variables needed to enable it", () => {
        const result = getDisabledOptionalIntegrations({
            ADMIN_MAIL_USERNAME: "admin@example.com",
            ADMIN_MAIL_PASSWORD: "mail-password",
            THEMOVIEDB_API_KEY: "tmdb-key",
        });

        expect(result).toEqual([
            {
                feature: "GitHub sign-in",
                missingEnvVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
            },
            {
                feature: "Google sign-in",
                missingEnvVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
            },
            {
                feature: "Game provider (IGDB)",
                missingEnvVars: ["IGDB_CLIENT_ID", "IGDB_CLIENT_SECRET"],
            },
            {
                feature: "LLM book genre enrichment",
                missingEnvVars: ["LLM_API_KEY"],
            },
        ]);
    });

    it("returns no warnings when every optional integration is configured", () => {
        expect(getDisabledOptionalIntegrations({
            LLM_API_KEY: "llm-key",
            IGDB_CLIENT_ID: "igdb-id",
            GOOGLE_CLIENT_ID: "google-id",
            GITHUB_CLIENT_ID: "github-id",
            IGDB_CLIENT_SECRET: "igdb-secret",
            ADMIN_MAIL_PASSWORD: "mail-password",
            THEMOVIEDB_API_KEY: "tmdb-key",
            GOOGLE_CLIENT_SECRET: "google-secret",
            GITHUB_CLIENT_SECRET: "github-secret",
            ADMIN_MAIL_USERNAME: "admin@example.com",
        })).toEqual([]);
    });
});
