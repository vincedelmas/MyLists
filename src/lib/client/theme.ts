export const THEME_STORAGE_KEY = "mylists-theme";

export const THEME_OPTIONS = ["system", "light", "dark"] as const;

export type ThemePreference = typeof THEME_OPTIONS[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

const THEME_COLORS: Record<ResolvedTheme, string> = {
    light: "#ffffff",
    dark: "#0d0d0d",
};


export const isThemePreference = (value: unknown): value is ThemePreference => {
    return typeof value === "string" && THEME_OPTIONS.includes(value as ThemePreference);
};


export const getStoredTheme = (): ThemePreference => {
    if (typeof window === "undefined") return "system";

    try {
        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        return isThemePreference(storedTheme) ? storedTheme : "system";
    } catch {
        return "system";
    }
};


export const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};


export const resolveTheme = (theme: ThemePreference): ResolvedTheme => {
    return theme === "system" ? getSystemTheme() : theme;
};


export const applyTheme = (theme: ThemePreference): ResolvedTheme => {
    const resolvedTheme = resolveTheme(theme);

    if (typeof document === "undefined") return resolvedTheme;

    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = theme;
    root.style.colorScheme = resolvedTheme;

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", THEME_COLORS[resolvedTheme]);

    return resolvedTheme;
};


export const persistTheme = (theme: ThemePreference) => {
    if (typeof window === "undefined") return;

    try {
        if (theme === "system") {
            window.localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
    } catch {
        // The in-memory preference still works when storage is unavailable.
    }
};


export const themeInitializationScript = `
(() => {
    const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    const colors = ${JSON.stringify(THEME_COLORS)};
    let preference = "system";

    try {
        const stored = localStorage.getItem(storageKey);
        if (stored === "light" || stored === "dark") preference = stored;
    } catch {}

    const resolved = preference === "system"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : preference;
    const root = document.documentElement;

    root.classList.toggle("dark", resolved === "dark");
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", colors[resolved]);
})();
`;
