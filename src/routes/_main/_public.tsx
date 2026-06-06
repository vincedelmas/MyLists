import {toast} from "sonner";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";


type AuthRedirectSearch = {
    message?: string;
    redirect?: string;
    authExpired?: boolean;
};


const validateAuthRedirectSearch = (search: Record<string, any>): AuthRedirectSearch => {
    const normalizeAuthRedirect = (value?: unknown) => {
        if (typeof value !== "string" || !value.trim()) return undefined;

        try {
            const url = new URL(value, "http://mylists.local");
            if (url.origin !== "http://mylists.local") return undefined;

            const path = `${url.pathname}${url.search}${url.hash}`;
            if (!path.startsWith("/") || path.startsWith("//")) return undefined;

            return path;
        }
        catch {
            return undefined;
        }
    };

    return {
        authExpired: search.authExpired === true ? true : undefined,
        message: typeof search.message === "string" ? search.message : undefined,
        redirect: normalizeAuthRedirect(search.redirect),
    };
}


export const Route = createFileRoute("/_main/_public")({
    validateSearch: validateAuthRedirectSearch,
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
