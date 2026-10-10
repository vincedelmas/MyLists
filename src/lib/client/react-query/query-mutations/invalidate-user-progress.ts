import type {QueryClient} from "@tanstack/react-query";
import {profilePinsOptions} from "@/lib/client/react-query/query-options/profile-pins.options";
import {continueOptions, profileHeaderOptions, profileRecentFeedOptions, profileSummaryOptions} from "@/lib/client/react-query/query-options";


export const invalidateUserProgressQueries = (queryClient: QueryClient, username: string, { refetchContinue = true, refetchSecondary = true } = {}) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["collections", "details", "read"], refetchType: refetchSecondary ? "active" : "none" }),
    queryClient.invalidateQueries({ queryKey: ["dynamic-lists"], refetchType: "none" }),
    queryClient.invalidateQueries({ queryKey: ["dynamic-lists", "user", username], refetchType: refetchSecondary ? "active" : "none" }),
    queryClient.invalidateQueries({ queryKey: profilePinsOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),
    queryClient.invalidateQueries({ queryKey: ["release-calendar", username], refetchType: refetchSecondary ? "active" : "none" }),

    // Public header has its own level, including when profile content is hidden
    queryClient.invalidateQueries({ queryKey: profileHeaderOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),

    queryClient.invalidateQueries({ queryKey: ["allUpdates", username], refetchType: refetchSecondary ? "active" : "none" }),
    queryClient.invalidateQueries({ queryKey: profileSummaryOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),
    queryClient.invalidateQueries({ queryKey: profileRecentFeedOptions(username).queryKey }),
    queryClient.invalidateQueries({ queryKey: continueOptions(username).queryKey, refetchType: refetchContinue ? "active" : "none" }),
]);
