import React, {createContext, useCallback, useEffect, useMemo, useState} from "react";
import {
    applyTheme,
    getStoredTheme,
    persistTheme,
    resolveTheme,
    THEME_STORAGE_KEY,
    type ResolvedTheme,
    type ThemePreference,
} from "@/lib/client/theme";


type ThemeContextValue = {
    theme: ThemePreference;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: ThemePreference) => void;
};


const ThemeContext = createContext<ThemeContextValue | null>(null);


export function ThemeProvider({ children }: React.PropsWithChildren) {
    const [theme, setThemeState] = useState<ThemePreference>(getStoredTheme);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

    const setTheme = useCallback((nextTheme: ThemePreference) => {
        persistTheme(nextTheme);
        setThemeState(nextTheme);
    }, []);

    useEffect(() => {
        const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
        const syncTheme = () => setResolvedTheme(applyTheme(theme));

        syncTheme();

        if (theme === "system") colorScheme.addEventListener("change", syncTheme);
        return () => colorScheme.removeEventListener("change", syncTheme);
    }, [theme]);

    useEffect(() => {
        const syncStoredTheme = (event: StorageEvent) => {
            if (event.key !== THEME_STORAGE_KEY) return;
            setThemeState(getStoredTheme());
        };

        window.addEventListener("storage", syncStoredTheme);
        return () => window.removeEventListener("storage", syncStoredTheme);
    }, []);

    const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [resolvedTheme, setTheme, theme]);

    return <ThemeContext value={value}>{children}</ThemeContext>;
}


export function useTheme() {
    const context = React.use(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
}
