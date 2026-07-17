import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {authOptions} from "@/lib/client/react-query/query-options";
import {resetCacheForViewerTransition} from "@/lib/client/react-query/query-options/viewer-session";


export const useAuth = () => {
    const queryClient = useQueryClient();
    const { data: currentUser } = useSuspenseQuery(authOptions);

    const setCurrentUser = async () => {
        await queryClient.invalidateQueries({ queryKey: authOptions.queryKey });
        const nextUser = await queryClient.fetchQuery({ ...authOptions, staleTime: 0 });
        resetCacheForViewerTransition(
            queryClient,
            currentUser?.id ?? null,
            nextUser?.id ?? null,
            authOptions.queryKey,
            nextUser,
        );
    };

    if (currentUser) {
        return {
            currentUser,
            setCurrentUser,
            isAnonymous: false as const,
        };
    }

    return {
        setCurrentUser,
        currentUser: null,
        isAnonymous: true as const,
    };
};
