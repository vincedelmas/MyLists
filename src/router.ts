import {toast} from "sonner";
import {routeTree} from "@/routeTree.gen";
import {createRouter} from "@tanstack/react-router";
import {NotFound} from "@/lib/client/components/general/NotFound";
import {NavLoader} from "./lib/client/components/general/NavLoader";
import {FormattedError, FormZodError} from "@/lib/utils/error-classes";
import {MutationCache, QueryCache, QueryClient} from "@tanstack/react-query";
import {setupRouterSsrQueryIntegration} from "@tanstack/react-router-ssr-query";
import {ErrorCatchBoundary} from "@/lib/client/components/general/ErrorCatchBoundary";


export function getRouter() {
    const queryClient = new QueryClient({
        queryCache: new QueryCache({
            onError: async (_error, query) => {
                if (query?.meta?.errorToastMessage) {
                    toast.error(query.meta.errorToastMessage);
                }
            },
        }),
        mutationCache: new MutationCache({
            onError: async (error, _variables, _context, mutation) => {
                if (mutation.meta?.noGlobalErrorToast) return;

                if (error instanceof FormattedError) {
                    toast.warning(error.message);
                }
                else if (error instanceof FormZodError) {
                    toast.error("Please check the form for errors.");
                }
                else if ("isNotFound" in error && error.isNotFound) {
                    toast.error("The requested resource was not found.");
                }
                else {
                    toast.error(mutation.meta?.errorToastMessage || error.message || "An unexpected error occurred.");
                }
            },
            onSuccess: (_data, _variables, _context, mutation) => {
                if (mutation?.meta?.successToastMessage) {
                    toast.success(mutation.meta.successToastMessage);
                }
            }
        }),
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 2 * 1000,
                refetchOnWindowFocus: false,
            },
        },
    });

    const router = createRouter({
        routeTree,
        context: { queryClient },
        defaultPreload: false,
        defaultPreloadStaleTime: 0,
        defaultErrorComponent: ErrorCatchBoundary,
        defaultNotFoundComponent: NotFound,
        defaultPendingComponent: NavLoader,
        defaultPendingMs: 5000,
        defaultPendingMinMs: 200,
        scrollRestoration: true,
        defaultStructuralSharing: true,
        notFoundMode: "root",
    });

    setupRouterSsrQueryIntegration({
        router,
        queryClient,
        handleRedirects: true,
        wrapQueryClient: true,
    });

    return router;
}


declare module "@tanstack/react-query" {
    interface Register {
        queryMeta: {
            errorToastMessage?: string,
        },
        mutationMeta: {
            errorToastMessage?: string,
            successToastMessage?: string,
            noGlobalErrorToast?: boolean,
        }
    }
}
