import type {QueryClient} from "@tanstack/react-query";
import {continueOptions, profileHeaderOptions, profileRecentFeedOptions, profileSummaryOptions} from "@/lib/client/react-query/query-options";


export const invalidateUserProgressQueries = (queryClient: QueryClient, username: string, { refetchContinue = true, refetchSecondary = true } = {}) => Promise.all([
    // Public header has its own level, including when profile content is hidden
    queryClient.invalidateQueries({ queryKey: profileHeaderOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),

    queryClient.invalidateQueries({ queryKey: ["allUpdates", username], refetchType: refetchSecondary ? "active" : "none" }),
    queryClient.invalidateQueries({ queryKey: profileSummaryOptions(username).queryKey, refetchType: refetchSecondary ? "active" : "none" }),
    queryClient.invalidateQueries({ queryKey: profileRecentFeedOptions(username).queryKey }),
    queryClient.invalidateQueries({ queryKey: continueOptions(username).queryKey, refetchType: refetchContinue ? "active" : "none" }),
]);
