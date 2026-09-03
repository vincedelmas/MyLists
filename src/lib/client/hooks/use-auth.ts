import authClient from "@/lib/utils/auth-client";
import {getAuthState} from "@/lib/utils/auth-utils";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {useNavigate, useRouteContext, useRouter} from "@tanstack/react-router";


export const useAuth = () => {
    const router = useRouter();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { authQueryOptions } = useRouteContext({ from: "__root__" });

    const currentUser = useSuspenseQuery(authQueryOptions).data;
    const state = getAuthState(currentUser);

    const refreshCurrentUser = async () => {
        await queryClient.invalidateQueries({ queryKey: authQueryOptions.queryKey });
    };

    const clearApplicationData = async () => {
        await queryClient.cancelQueries({ predicate: (query) => query.queryKey[0] !== authQueryOptions.queryKey[0] });
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authQueryOptions.queryKey[0] });
    };

    const completeSignIn = async (redirectTo: string) => {
        const signedInUser = await queryClient.fetchQuery({ ...authQueryOptions, staleTime: 0 });
        if (!signedInUser) throw new Error("The session could not be loaded after sign-in.");

        await clearApplicationData();
        await navigate({ href: redirectTo, replace: true });
        await router.invalidate();

        return signedInUser;
    };

    const clearSession = async (redirectTo = "/") => {
        queryClient.setQueryData(authQueryOptions.queryKey, null);
        await clearApplicationData();
        await navigate({ href: redirectTo, replace: true });
        await router.invalidate();
    };

    const signOut = async (redirectTo = "/") => {
        const { error } = await authClient.signOut();
        if (error) throw error;

        await clearSession(redirectTo);
    };

    const actions = { clearSession, completeSignIn, refreshCurrentUser, signOut };

    if (currentUser) {
        return {
            ...actions,
            state,
            currentUser,
            isAnonymous: false as const,
        };
    }

    return {
        ...actions,
        state,
        currentUser: null,
        isAnonymous: true as const,
    };
};
