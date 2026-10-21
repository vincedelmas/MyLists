import {useRef, useState} from "react";
import {ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import type {TextInputInstance} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import * as z from "zod";
import {useSignInMutation} from "../../lib/react-query/query-mutations/auth.mutations";
import {backendUrl} from "../../lib/config";
import {colors, commonStyles} from "../../theme";


const credentialsSchema = z.object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
});

export function SignInScreen() {
    const passwordInput = useRef<TextInputInstance>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const login = useSignInMutation();
    const isSubmitting = login.isPending;
    const [error, setError] = useState<string>();

    const signIn = async () => {
        if (isSubmitting) return;
        setError(undefined);
        const result = credentialsSchema.safeParse({email: email.trim(), password});
        if (!result.success) {
            setError(result.error.issues[0].message);
            return;
        }

        login.mutate(result.data, {
            onSuccess: () => setPassword(""),
            onError: error => setError(error.message),
        });
    };

    const openWebsite = async (path: "/login" | "/forgot-password") => {
        try {
            await Linking.openURL(`${backendUrl}${path}`);
        }
        catch {
            setError("We couldn’t open your browser. Please visit the MyLists website.");
        }
    };

    return (
        <SafeAreaView style={commonStyles.screen}>
            <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={[commonStyles.content, styles.content]}>
                        <View style={styles.masthead}>
                            <Text style={commonStyles.brand}>MyLists.</Text>
                            <Text style={styles.mastheadNote}>A little more you.</Text>
                        </View>

                        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.shelf}>
                            {[
                                {label: "WATCH", height: 98, color: "#B8CDB1", width: 62},
                                {label: "PLAY", height: 126, color: "#81B89A", width: 64},
                                {label: "READ", height: 112, color: "#E0CCA3", width: 58},
                                {label: "REPEAT", height: 142, color: "#A7B9AD", width: 68},
                            ].map(({label, height, color, width}) => (
                                <View key={label} style={[styles.spine, {height, width, backgroundColor: color}]}>
                                    <View style={styles.spineRule}/>
                                    <Text style={styles.spineLabel}>{label}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.intro}>
                            <Text style={commonStyles.eyebrow}>YOUR PERSONAL COLLECTION</Text>
                            <Text accessibilityRole="header" style={commonStyles.title}>Good to have{"\n"}you back.</Text>
                            <Text style={commonStyles.body}>The stories you love. The ones still waiting.{"\n"}Pick up right where you left off.</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.field}>
                                <Text nativeID="email-label" style={styles.label}>Email address</Text>
                                <TextInput
                                    accessibilityLabel="Email address"
                                    accessibilityLabelledBy="email-label"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    textContentType="emailAddress"
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                    submitBehavior="submit"
                                    onSubmitEditing={() => passwordInput.current?.focus()}
                                    editable={!isSubmitting}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="you@example.com"
                                    placeholderTextColor={colors.muted}
                                    selectionColor={colors.accent}
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.field}>
                                <Text nativeID="password-label" style={styles.label}>Password</Text>
                                <View style={styles.passwordField}>
                                    <TextInput
                                        ref={passwordInput}
                                        accessibilityLabel="Password"
                                        accessibilityLabelledBy="password-label"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="current-password"
                                        textContentType="password"
                                        secureTextEntry={!showPassword}
                                        editable={!isSubmitting}
                                        value={password}
                                        onChangeText={setPassword}
                                        returnKeyType="go"
                                        onSubmitEditing={() => void signIn()}
                                        placeholder="Your password"
                                        placeholderTextColor={colors.muted}
                                        selectionColor={colors.accent}
                                        style={[styles.input, styles.passwordInput]}
                                    />
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.showPassword}
                                    >
                                        <Text style={styles.linkText}>{showPassword ? "Hide" : "Show"}</Text>
                                    </Pressable>
                                </View>
                            </View>

                            <Pressable accessibilityRole="link" onPress={() => void openWebsite("/forgot-password")} style={styles.forgot}>
                                <Text style={styles.linkText}>Forgot password?</Text>
                            </Pressable>

                            {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={commonStyles.error}>{error}</Text>}

                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{disabled: isSubmitting, busy: isSubmitting}}
                                disabled={isSubmitting}
                                onPress={() => void signIn()}
                                style={({pressed}) => [commonStyles.button, pressed && commonStyles.pressed, isSubmitting && commonStyles.disabled]}
                            >
                                {isSubmitting ? <ActivityIndicator accessibilityLabel="Signing in" color={colors.accentText}/> :
                                    <Text style={commonStyles.buttonText}>Sign in</Text>}
                            </Pressable>
                        </View>

                        <Pressable accessibilityRole="link" onPress={() => void openWebsite("/login")} style={styles.website}>
                            <Text style={styles.websiteText}>Another sign-in method? <Text style={styles.linkText}>Open MyLists on the web ↗</Text></Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    keyboard: {flex: 1},
    scroll: {flexGrow: 1, paddingHorizontal: 28, paddingVertical: 24},
    content: {gap: 30, flexGrow: 1, justifyContent: "center"},
    masthead: {flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8},
    mastheadNote: {color: colors.muted, fontSize: 12},
    shelf: {flexDirection: "row", alignItems: "flex-end", gap: 6, alignSelf: "center", paddingTop: 8, borderBottomWidth: 2, borderBottomColor: colors.border},
    spine: {borderTopLeftRadius: 5, borderTopRightRadius: 5, padding: 10, justifyContent: "space-between"},
    spineRule: {height: 2, backgroundColor: "#22382C", opacity: 0.35},
    spineLabel: {fontSize: 9, fontWeight: "800", color: colors.accentText, letterSpacing: 0.5},
    intro: {gap: 14},
    form: {gap: 16},
    field: {gap: 9},
    label: {color: colors.text, fontWeight: "600", fontSize: 14},
    input: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, color: colors.text, fontSize: 16, minHeight: 56},
    passwordField: {flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface},
    passwordInput: {flex: 1, borderWidth: 0, minWidth: 0},
    showPassword: {justifyContent: "center", paddingHorizontal: 16, minWidth: 64, minHeight: 48},
    linkText: {color: colors.accent, fontSize: 13, fontWeight: "600"},
    forgot: {alignSelf: "flex-end", minHeight: 44, justifyContent: "center", marginVertical: -8},
    website: {paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border},
    websiteText: {color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: "center"},
});
