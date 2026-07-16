import {queryOptions} from "@tanstack/react-query";
import {getCurrentUser} from "@/lib/server/functions/auth";
import {setViewerCacheIdentity} from "@/lib/client/react-query/query-options/viewer-cache";


export const authOptions = queryOptions({
    queryKey: ["currentUser"],
    queryFn: async () => {
        const currentUser = await getCurrentUser();
        setViewerCacheIdentity(currentUser?.id ?? null);
        return currentUser;
    },
    staleTime: 10 * 60 * 1000,
});
