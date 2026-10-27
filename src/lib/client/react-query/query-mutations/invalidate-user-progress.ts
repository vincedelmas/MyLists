import type {QueryClient} from "@tanstack/react-query";
import {profilePinsOptions} from "@/lib/client/react-query/query-options/profile-pins.options";
import {profileHeaderOptions, profileRecentFeedOptions, profileSummaryOptions} from "@/lib/client/react-query/query-options";


export const invalidateUserProgressQueries = (queryClient: QueryClient, username: string, { refetchContinue = true, refetchSecondary = true, progressChanged = true } = {}) => {
    return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections", "details", "read"], refetchType: refetchSecondary ? "active" : "none" }),
        queryClient.invalidateQueries({ queryKey: ["dynamic-lists"], refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: ["dynamic-lists", "user", username], refetchType: refetchSecondary ? "active" : "none" }),
        queryClient.invalidateQueries({ queryKey: profilePinsOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),
        progressChanged && queryClient.invalidateQueries({ queryKey: ["release-calendar", username], refetchType: refetchSecondary ? "active" : "none" }),

        // Public header has its own level, including when profile content is hidden
        progressChanged && queryClient.invalidateQueries({ queryKey: profileHeaderOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),
        progressChanged && queryClient.invalidateQueries({ queryKey: ["userList", "header", username], refetchType: refetchSecondary ? "active" : "none" }),

        queryClient.invalidateQueries({ queryKey: ["allUpdates", username], refetchType: refetchSecondary ? "active" : "none" }),
        queryClient.invalidateQueries({ queryKey: profileSummaryOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),
        queryClient.invalidateQueries({ queryKey: profileRecentFeedOptions(username).queryKey }),
        progressChanged && queryClient.invalidateQueries({ queryKey: ["continue", username], refetchType: refetchContinue ? "active" : "none" }),
    ]);
}
