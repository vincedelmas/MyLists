export const getSafeRedirectPath = (value: unknown, baseURL: string) => {
    if (typeof value !== "string" || !value.trim()) return undefined;

    try {
        const base = new URL(baseURL);
        const url = new URL(value, base);
        if (url.origin !== base.origin) return undefined;

        const path = `${url.pathname}${url.search}${url.hash}`;
        return path.startsWith("/") && !path.startsWith("//") ? path : undefined;
    }
    catch {
        return undefined;
    }
};
