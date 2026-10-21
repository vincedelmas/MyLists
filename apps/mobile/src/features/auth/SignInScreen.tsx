import {useRef, useState} from "react";
import {Linking, Pressable, View, type TextInputInstance} from "react-native";
import {ListChecks} from "lucide-react-native";
import * as z from "zod";
import {AppText, Button, Content, Field, Page, Section, uiStyles} from "../../components/ui";
import {useSignInMutation} from "../../lib/react-query/query-mutations/auth.mutations";
import {backendUrl} from "../../lib/config";
import {colors} from "../../theme";

const credentialsSchema = z.object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
});

export function SignInScreen() {
    const passwordInput = useRef<TextInputInstance>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState("");
    const login = useSignInMutation();
    const signIn = () => {
        if (login.isPending) return;
        setError("");
        const input = credentialsSchema.safeParse({email: email.trim(), password});
        if (!input.success) {
            setError(input.error.issues[0].message);
            return;
        }
        login.mutate(input.data, {onSuccess: () => setPassword(""), onError: (failure) => setError(failure.message)});
    };
    const open = (path: string) => {
        void Linking.openURL(`${backendUrl}${path}`).catch(() =>
            setError("Couldn’t open your browser. Please visit the MyLists website."),
        );
    };
    return (
        <Page title="MyLists" subtitle="Track movies, series, anime, games, books and manga">
            <Content>
                <View style={{paddingVertical: 24, gap: 12}}>
                    <ListChecks size={32} color={colors.accent} />
                    <AppText heading style={{fontSize: 30, lineHeight: 38}}>
                        Welcome back
                    </AppText>
                    <AppText muted>Sign in to keep tracking your media and pick up where you left off.</AppText>
                </View>
                <Section title="Sign in to MyLists">
                    <View style={uiStyles.padded}>
                        <Field
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            editable={!login.isPending}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="emailAddress"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordInput.current?.focus()}
                        />
                        <Field
                            label="Password"
                            inputRef={passwordInput}
                            value={password}
                            onChangeText={setPassword}
                            editable={!login.isPending}
                            secureTextEntry={!visible}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="current-password"
                            textContentType="password"
                            returnKeyType="go"
                            onSubmitEditing={signIn}
                        />
                        <View style={{flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8}}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setVisible((value) => !value)}
                                style={{paddingVertical: 12}}
                            >
                                <AppText muted>{visible ? "Hide password" : "Show password"}</AppText>
                            </Pressable>
                            <Pressable
                                accessibilityRole="link"
                                onPress={() => open("/forgot-password")}
                                style={{paddingVertical: 12}}
                            >
                                <AppText style={{color: colors.accent}}>Forgot password?</AppText>
                            </Pressable>
                        </View>
                        {error && (
                            <AppText accessibilityRole="alert" style={{color: colors.error}}>
                                {error}
                            </AppText>
                        )}
                        <Button label="Sign in" pending={login.isPending} onPress={signIn} />
                    </View>
                </Section>
                <Button secondary label="Create an account on MyLists" onPress={() => open("/register")} />
            </Content>
        </Page>
    );
}
