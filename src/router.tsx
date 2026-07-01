import {toast} from "sonner";
import {routeTree} from "@/routeTree.gen";
import {createRouter} from "@tanstack/react-router";
import {NotFound} from "@/lib/client/components/general/NotFound";
import {NavLoader} from "./lib/client/components/general/NavLoader";
import {setupCoreRouterSsrQueryIntegration} from "@tanstack/router-ssr-query-core";
import {ErrorCatchBoundary} from "@/lib/client/components/general/ErrorCatchBoundary";
import {FormattedError, FormZodError, ValidationError} from "@/lib/utils/error-classes";
import {MutationCache, QueryCache, QueryClient, QueryClientProvider} from "@tanstack/react-query";


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
                if (error instanceof ValidationError || error instanceof FormZodError) return;

                const noGlobalErrorToast = mutation.meta?.noGlobalErrorToast;
                if (error instanceof FormattedError) {
                    if (!noGlobalErrorToast) toast.warning(error.message);
                    return;
                }

                if ("isNotFound" in error && error.isNotFound) {
                    if (!noGlobalErrorToast) toast.error("The requested resource was not found.");
                    return;
                }

                // Always display toast for unexpected errors
                toast.error(mutation.meta?.errorToastMessage || error.message);
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
        Wrap: ({ children }) => {
            return (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            )
        },
    });

    // TanStack Start dev still do SSR on first load even when the app is
    // configured as SPA. Without this, queries filled on the server
    // are not hydrated into the client QueryClient, so route
    // guards don't work (like _public.tsx) in dev compared to prod.
    // In prod we are full SPA, so the SSR query stream is unnecessary
    // and can trigger stream lifetime cleanup warnings.
    if (import.meta.env.DEV) {
        setupCoreRouterSsrQueryIntegration({ router, queryClient });
    }

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
