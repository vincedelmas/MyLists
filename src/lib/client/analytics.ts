import {clientEnv} from "@/env/client";
import type PostHog from "posthog-js-lite";
import type {ApiProviderType, ImportSource, MediaType} from "@/lib/utils/enums";


let posthog: PostHog | null = null;


type AnalyticsEvents = {
    media_updated: {
        media_type: MediaType;
        source: "continue" | "list_dialog" | "details";
    };
    search_failed: {
        provider: ApiProviderType;
        page: number;
        advanced_filter_count: number;
    };
    media_add_opened: {
        media_type: MediaType;
        source: "quick_add";
        is_media_type_active: boolean;
    };
    import_opened: { source: ImportSource };
    import_submitted: { source: ImportSource };

    search_result_selected: {
        result_type: ApiProviderType | MediaType,
        surface: "navbar" | "mobile" | "search_page",
    };
    media_added: {
        media_type: MediaType;
        source: "details" | "quick_add",
    };
    search_results_viewed: {
        page: number,
        result_count: number,
        provider: ApiProviderType,
        advanced_filter_count: number,
        surface: "navbar" | "mobile" | "search_page",
    };
};


export const loadAnalytics = async () => {
    const key = clientEnv.VITE_PUBLIC_POSTHOG_KEY;
    if (
        typeof window === "undefined"
        || window.location.pathname.startsWith("/reset-password")
        || !import.meta.env.PROD
        || !key
    ) {
        return null;
    }

    const { default: PostHogClient } = await import("posthog-js-lite");

    posthog ??= new PostHogClient(key, {
        autocapture: false,
        disableSurveys: true,
        persistence: "localStorage",
        captureHistoryEvents: false,
        disableRemoteFeatureFlags: true,
        personProfiles: "identified_only",
        host: clientEnv.VITE_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    });

    return posthog;
};


export const captureEvent = <E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]) => {
    void loadAnalytics()
        .then(client => client?.capture(event, properties))
        .catch(error => console.warn("Analytics could not be loaded", error));
};
