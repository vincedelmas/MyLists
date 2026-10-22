import * as z from "zod";
import {colors} from "../../theme";
import {useRef, useState} from "react";
import type {TextInputRef} from "@expo/ui";
import {backendUrl} from "../../lib/config";
import {ListChecks} from "lucide-react-native";
import {Linking, Pressable, View} from "react-native";
import {useSignInMutation} from "../../lib/react-query/query-mutations/auth.mutations";
import {AppText, Button, Content, Field, Page, Section, uiStyles} from "../../components/ui";


const credentialsSchema = z.object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
});


export function SignInScreen() {
    const login = useSignInMutation();
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const passwordInput = useRef<TextInputRef>(null);

    const signIn = () => {
        if (login.isPending) return;
        setError("");

        const input = credentialsSchema.safeParse({ email: email.trim(), password });
        if (!input.success) {
            setError(input.error.issues[0].message);
            return;
        }

        login.mutate(input.data, { onSuccess: () => setPassword(""), onError: (failure) => setError(failure.message) });
    };

    const open = (path: string) => {
        void Linking.openURL(`${backendUrl}${path}`).catch(() =>
            setError("Couldn’t open your browser. Please visit the MyLists website."),
        );
    };

    return (
        <Page title="MyLists" subtitle="Track movies, series, anime, games, books and manga">
            <Content>
                <View style={{ paddingVertical: 24, gap: 12 }}>
                    <ListChecks size={32} color={colors.accent}/>
                    <AppText heading style={{ fontSize: 30, lineHeight: 38 }}>
                        Welcome back
                    </AppText>
                    <AppText muted={true}>
                        Sign in to keep tracking your media and pick up where you left off.
                    </AppText>
                </View>
                <Section title="Sign in to MyLists">
                    <View style={uiStyles.padded}>
                        <Field
                            label="Email"
                            value={email}
                            autoCorrect={false}
                            autoComplete="email"
                            returnKeyType="next"
                            autoCapitalize="none"
                            onChangeText={setEmail}
                            editable={!login.isPending}
                            keyboardType="email-address"
                            onSubmitEditing={() => passwordInput.current?.focus()}
                        />
                        <Field
                            label="Password"
                            value={password}
                            returnKeyType="go"
                            autoCorrect={false}
                            autoCapitalize="none"
                            inputRef={passwordInput}
                            onSubmitEditing={signIn}
                            onChangeText={setPassword}
                            secureTextEntry={!visible}
                            editable={!login.isPending}
                            autoComplete="current-password"
                        />
                        <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                            <Pressable
                                accessibilityRole="button"
                                style={{ paddingVertical: 12 }}
                                onPress={() => setVisible((value) => !value)}
                            >
                                <AppText muted={true}>
                                    {visible ? "Hide password" : "Show password"}
                                </AppText>
                            </Pressable>
                            <Pressable
                                accessibilityRole="link"
                                style={{ paddingVertical: 12 }}
                                onPress={() => open("/forgot-password")}
                            >
                                <AppText style={{ color: colors.accent }}>
                                    Forgot password?
                                </AppText>
                            </Pressable>
                        </View>
                        {error &&
                            <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                                {error}
                            </AppText>
                        }
                        <Button
                            label="Sign in"
                            onPress={signIn}
                            pending={login.isPending}
                        />
                    </View>
                </Section>
                <Button
                    secondary={true}
                    label="Create an account on MyLists"
                    onPress={() => open("/register")}
                />
            </Content>
        </Page>
    );
}
