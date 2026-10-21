import {ActivityIndicator, Pressable, Text, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {authClient} from "../../lib/auth-client";
import {colors, commonStyles} from "../../theme";


export function SessionGate({children}: {children: React.ReactNode}) {
    const {isPending, error, refetch, isRefetching} = authClient.useSession();

    if (isPending || (error && error.status !== 401)) {
        return (
            <SafeAreaView style={[commonStyles.screen, commonStyles.centered]}>
                <View style={commonStyles.content}>
                    <Text style={commonStyles.brand}>MyLists.</Text>
                    {isPending ? (
                        <ActivityIndicator accessibilityLabel="Checking your session" color={colors.accent}/>
                    ) : (
                        <>
                            <Text accessibilityRole="header" style={commonStyles.title}>Let’s reconnect.</Text>
                            <Text accessibilityRole="alert" style={commonStyles.body}>
                                We couldn’t reach MyLists. Check your connection and try again.
                            </Text>
                            <Pressable
                                accessibilityRole="button"
                                disabled={isRefetching}
                                onPress={() => void refetch()}
                                style={({pressed}) => [commonStyles.button, pressed && commonStyles.pressed]}
                            >
                                <Text style={commonStyles.buttonText}>Try again</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    return children;
}
