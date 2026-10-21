import {AppState} from "react-native";
import {ApiError} from "./api-client";
import React, {useEffect, useState} from "react";
import {focusManager, QueryClient, QueryClientProvider} from "@tanstack/react-query";


export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                retry: (attempt, error) => attempt < 1 && !(error instanceof ApiError && error.status < 500),
            },
        },
    }));

    useEffect(() => {
        const subscription = AppState.addEventListener("change", state => focusManager.setFocused(state === "active"));
        return () => subscription.remove();
    }, []);

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
