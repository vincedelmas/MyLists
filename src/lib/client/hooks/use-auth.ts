import {useRouteContext} from "@tanstack/react-router";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";


export const useAuth = () => {
    const { authQueryOptions } = useRouteContext({ from: "__root__" });

    const queryClient = useQueryClient();
    const currentUser = useSuspenseQuery(authQueryOptions).data;

    const setCurrentUser = async () => {
        await queryClient.invalidateQueries({ queryKey: authQueryOptions.queryKey });
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
