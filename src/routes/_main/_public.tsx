import {toast} from "sonner";
import {authRedirectSearchSchema} from "@/lib/schemas";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_public")({
    validateSearch: authRedirectSearchSchema,
    beforeLoad: async ({ context: { queryClient }, search }) => {
        const currentUser = queryClient.getQueryData(authOptions.queryKey);

        if (search.authExpired) {
            await queryClient.invalidateQueries({ queryKey: authOptions.queryKey });
            queryClient.clear();
            toast.warning("You need to sign in to access this content.");
            throw redirect({ to: "/login", replace: true });
        }

        if (currentUser) {
            throw redirect({
                replace: true,
                href: search.redirect || `/profile/${currentUser.name}`,
            });
        }
    },
});
