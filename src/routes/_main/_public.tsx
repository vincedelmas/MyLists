import {toast} from "@/lib/client/components/ui/toast";
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
            toast.add({ title: "You need to sign in to access this content.", type: "warning" });
            throw redirect({ to: "/login", replace: true, search: { redirect: search.redirect } });
        }

        if (currentUser) {
            throw redirect({
                replace: true,
                href: search.redirect || `/profile/${currentUser.name}`,
            });
        }
    },
});
