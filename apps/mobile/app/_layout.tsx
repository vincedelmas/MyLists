import {Profiler} from "react";
import {navigationTimingEnabled, recordNavigationTiming} from "../src/lib/diagnostics/navigation-timing";
import {Stack} from "expo-router";
import {colors} from "../src/theme";
import {StatusBar} from "expo-status-bar";
import {authClient} from "../src/lib/auth-client";
import {QueryProvider} from "../src/lib/QueryProvider";
import {SessionGate} from "../src/features/auth/SessionGate";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {DarkTheme, ThemeProvider} from "expo-router/react-navigation";


const navigationTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        text: colors.text,
        card: colors.surface,
        border: colors.border,
        primary: colors.accent,
        background: colors.background,
    },
};


export default function RootLayout() {
    const { data: session } = authClient.useSession();

    const navigator = (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background }
            }}
        >
            <Stack.Protected guard={!session}>
                <Stack.Screen name="sign-in"/>
            </Stack.Protected>
            <Stack.Protected guard={!!session}>
                <Stack.Screen name="(tabs)"/>
            </Stack.Protected>
        </Stack>
    );

    return (
        <ThemeProvider value={navigationTheme}>
            <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.background }}>
                <StatusBar style="light"/>
                <SessionGate>
                    <QueryProvider key={session?.user.id ?? "anonymous"}>
                        {navigationTimingEnabled
                            ? (
                                <Profiler
                                    id="navigation-tree"
                                    onRender={(_id, phase, duration) =>
                                        recordNavigationTiming(`navigation-tree-${phase}`, undefined, duration)
                                    }
                                >
                                    {navigator}
                                </Profiler>
                            )
                            : (
                                navigator
                            )
                        }
                    </QueryProvider>
                </SessionGate>
            </SafeAreaProvider>
        </ThemeProvider>
    );
}
