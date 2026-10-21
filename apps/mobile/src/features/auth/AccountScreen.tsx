import {useState} from "react";
import {ActivityIndicator, Pressable, Text, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {authClient} from "../../lib/auth-client";
import {colors, commonStyles} from "../../theme";


export function AccountScreen() {
    const {data: session} = authClient.useSession();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [error, setError] = useState<string>();

    const signOut = async () => {
        setIsSigningOut(true);
        setError(undefined);
        try {
            const result = await authClient.signOut();
            if (result.error) setError("We couldn’t sign you out. Please try again.");
        }
        catch {
            setError("We couldn’t reach MyLists. Check your connection and try again.");
        }
        finally {
            setIsSigningOut(false);
        }
    };

    return (
        <SafeAreaView style={[commonStyles.screen, commonStyles.centered]}>
            <View style={commonStyles.content}>
                <Text style={commonStyles.brand}>MyLists.</Text>
                <Text style={commonStyles.eyebrow}>YOU’RE SIGNED IN</Text>
                <Text accessibilityRole="header" style={commonStyles.title}>Welcome back,{"\n"}{session?.user.name}.</Text>
                <Text style={commonStyles.body}>{session?.user.email}</Text>
                <Text style={commonStyles.body}>Your mobile collection starts here. Lists and tracking are coming next.</Text>
                {error && <Text accessibilityRole="alert" style={commonStyles.error}>{error}</Text>}
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{disabled: isSigningOut, busy: isSigningOut}}
                    disabled={isSigningOut}
                    onPress={() => void signOut()}
                    style={({pressed}) => [commonStyles.button, pressed && commonStyles.pressed, isSigningOut && commonStyles.disabled]}
                >
                    {isSigningOut ? <ActivityIndicator accessibilityLabel="Signing out" color={colors.accentText}/> :
                        <Text style={commonStyles.buttonText}>Sign out</Text>}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
