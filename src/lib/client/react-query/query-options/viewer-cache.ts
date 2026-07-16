export type ViewerCacheIdentity = number | null;
type ViewerCacheToken = number | "anonymous" | "unresolved";


let currentViewer: ViewerCacheToken = "unresolved";


/**
 * The application is client-rendered (`ssr: false`), so one module-local token
 * safely partitions audience-dependent React Query data for the active browser
 * session. Better Auth updates this token before publishing a session result.
 */
export const setViewerCacheIdentity = (viewerId: ViewerCacheIdentity) => {
    currentViewer = viewerId ?? "anonymous";
};


export const viewerScopedKey = <const TKey extends readonly unknown[]>(key: TKey) => [
    ...key,
    { viewer: currentViewer },
] as const;
