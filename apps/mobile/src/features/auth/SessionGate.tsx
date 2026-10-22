import React from "react";
import {authClient} from "../../lib/auth-client";
import {colors, commonStyles} from "../../theme";
import {SafeAreaView} from "react-native-safe-area-context";
import {ActivityIndicator, Pressable, Text, View} from "react-native";


export function SessionGate({ children }: { children: React.ReactNode }) {
    const { isPending, error, refetch, isRefetching } = authClient.useSession();

    if (isPending || (error && error.status !== 401)) {
        return (
            <SafeAreaView style={[commonStyles.screen, commonStyles.centered]}>
                <View style={commonStyles.content}>
                    <Text style={commonStyles.brand}>
                        MyLists.
                    </Text>
                    {isPending ?
                        <ActivityIndicator
                            color={colors.accent}
                            accessibilityLabel="Checking your session"
                        />
                        :
                        <>
                            <Text accessibilityRole="header" style={commonStyles.title}>
                                Let’s reconnect.
                            </Text>
                            <Text accessibilityRole="alert" style={commonStyles.body}>
                                We couldn’t reach MyLists. Check your connection and try again.
                            </Text>
                            <Pressable
                                disabled={isRefetching}
                                accessibilityRole="button"
                                onPress={() => void refetch()}
                                style={({ pressed }) => [commonStyles.button, pressed && commonStyles.pressed]}
                            >
                                <Text style={commonStyles.buttonText}>
                                    Try again
                                </Text>
                            </Pressable>
                        </>
                    }
                </View>
            </SafeAreaView>
        );
    }

    return children;
}
