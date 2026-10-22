import {AppState} from "react-native";
import {ApiError} from "./api-client";
import * as Network from "expo-network";
import React, {useEffect, useState} from "react";
import {focusManager, onlineManager, QueryClient, QueryClientProvider} from "@tanstack/react-query";


export function QueryProvider({ children }: { children: React.ReactNode }) {
    const networkState = Network.useNetworkState();

    const [client] = useState(() => new QueryClient({
        defaultOptions: {
            mutations: { retry: false, networkMode: "always" },
            queries: {
                staleTime: 30_000,
                retry: (attempt, error) => attempt < 1 && !(error instanceof ApiError && error.status < 500),
            },
        },
    }));

    useEffect(() => {
        focusManager.setFocused(AppState.currentState === "active");
        const subscription = AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));

        return () => {
            subscription.remove();
            client.clear();
        };

    }, [client]);

    useEffect(() => {
        if (networkState.isConnected !== undefined) {
            onlineManager.setOnline(networkState.isConnected);
        }
    }, [networkState.isConnected]);

    return (
        <QueryClientProvider client={client}>
            {children}
        </QueryClientProvider>
    );
}
