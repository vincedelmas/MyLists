import type {QueryClient, QueryKey} from "@tanstack/react-query";
import type {ViewerCacheIdentity} from "./viewer-cache";


/** Drops every prior-principal payload while retaining the freshly fetched session. */
export const resetCacheForViewerTransition = <TSession>(
    queryClient: QueryClient,
    previousViewer: ViewerCacheIdentity,
    nextViewer: ViewerCacheIdentity,
    authKey: QueryKey,
    session: TSession,
) => {
    if (previousViewer === nextViewer) return false;
    queryClient.clear();
    queryClient.setQueryData(authKey, session);
    return true;
};
