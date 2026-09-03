import {createFileRoute, redirect} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";
import {getAuthState, isAuthenticatedAuthState} from "@/lib/utils/auth-utils";


export const Route = createFileRoute("/_main/_private")({
    beforeLoad: async ({ context: { queryClient }, location }) => {
        const currentUser = queryClient.getQueryData(authOptions.queryKey);
        const authState = getAuthState(currentUser);

        if (!isAuthenticatedAuthState(authState)) {
            throw redirect({
                to: "/login",
                replace: true,
                search: { redirect: location.href, message: "You need to sign in to access this content." },
            });
        }
    },
});
