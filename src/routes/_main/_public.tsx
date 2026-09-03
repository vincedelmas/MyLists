import {toast} from "@/lib/client/components/ui/toast";
import {authRedirectSearchSchema} from "@/lib/schemas";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";
import {getAuthState, hasGeneratedUsernameSuffix, isAuthenticatedAuthState} from "@/lib/utils/auth-utils";


export const Route = createFileRoute("/_main/_public")({
    validateSearch: authRedirectSearchSchema,
    beforeLoad: async ({ context: { queryClient }, search }) => {
        const currentUser = queryClient.getQueryData(authOptions.queryKey);
        const authState = getAuthState(currentUser);

        if (search.authExpired) {
            await queryClient.invalidateQueries({ queryKey: authOptions.queryKey });
            queryClient.clear();

            toast.add({
                type: "warning",
                title: "You need to sign in to access this content.",
            });

            throw redirect({
                to: "/login",
                replace: true,
                search: { redirect: search.redirect },
            });
        }

        if (currentUser && isAuthenticatedAuthState(authState)) {
            if (search.usernameNotice === "check") {
                throw redirect({
                    replace: true,
                    to: "/profile/$username",
                    params: { username: currentUser.name },
                    search: hasGeneratedUsernameSuffix(currentUser.name) ? { usernameNotice: "assigned" } : {},
                });
            }

            throw redirect({
                replace: true,
                href: search.redirect || `/profile/${currentUser.name}`,
            });
        }
    },
});
