import {createFileRoute, redirect} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_private")({
    beforeLoad: async ({ context: { queryClient }, location }) => {
        const currentUser = queryClient.getQueryData(authOptions.queryKey);

        if (!currentUser) {
            throw redirect({
                to: "/login",
                replace: true,
                search: {
                    redirect: location.href,
                    message: "You need to sign in to access this content.",
                },
            });
        }
    },
});
