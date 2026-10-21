import {DarkTheme, ThemeProvider} from "expo-router/react-navigation";
import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {authClient} from "../src/lib/auth-client";
import {SessionGate} from "../src/features/auth/SessionGate";
import {colors} from "../src/theme";
import {QueryProvider} from "../src/lib/QueryProvider";

const navigationTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
    },
};

export default function RootLayout() {
    const {data: session} = authClient.useSession();

    return (
        <ThemeProvider value={navigationTheme}>
            <SafeAreaProvider style={{flex: 1, backgroundColor: colors.background}}>
                <StatusBar style="light" />
                <SessionGate>
                    <QueryProvider key={session?.user.id ?? "anonymous"}>
                        <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: colors.background}}}>
                            <Stack.Protected guard={!session}>
                                <Stack.Screen name="sign-in" />
                            </Stack.Protected>
                            <Stack.Protected guard={!!session}>
                                <Stack.Screen name="(tabs)" />
                            </Stack.Protected>
                        </Stack>
                    </QueryProvider>
                </SessionGate>
            </SafeAreaProvider>
        </ThemeProvider>
    );
}
