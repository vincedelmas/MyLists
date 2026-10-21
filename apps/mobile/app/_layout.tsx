import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {authClient} from "../src/lib/auth-client";
import {SessionGate} from "../src/features/auth/SessionGate";
import {colors} from "../src/theme";
import {QueryProvider} from "../src/lib/QueryProvider";


export default function RootLayout() {
    const { data: session } = authClient.useSession();

    return (
        <SafeAreaProvider>
            <StatusBar style="light"/>
            <SessionGate>
                <QueryProvider key={session?.user.id ?? "anonymous"}>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                        <Stack.Protected guard={!session}>
                            <Stack.Screen name="sign-in"/>
                        </Stack.Protected>
                        <Stack.Protected guard={!!session}>
                            <Stack.Screen name="index"/>
                        </Stack.Protected>
                    </Stack>
                </QueryProvider>
            </SessionGate>
        </SafeAreaProvider>
    );
}
