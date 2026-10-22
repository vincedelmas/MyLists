import {Image} from "expo-image";
import {router} from "expo-router";
import {NativeHost} from "./native-host";
import {assetUrl} from "../lib/api-client";
import {useOnline} from "../lib/use-online";
import {colors, commonStyles} from "../theme";
import {useRoute} from "expo-router/react-navigation";
import {SafeAreaView} from "react-native-safe-area-context";
import {ArrowLeft, ChevronRight} from "lucide-react-native";
import {Profiler, useEffect, useRef, type ReactNode, type Ref} from "react";
import {navigationTimingEnabled, recordNavigationTiming, observeNavigationFrame} from "../lib/diagnostics/navigation-timing";
import {Button as NativeButton, Column, Picker, Text as NativeText, TextInput as NativeTextInput, useNativeState, type TextInputProps, type TextInputRef} from "@expo/ui";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type TextProps,
    type StyleProp,
    type ViewStyle,
} from "react-native";


export function AppText({ muted, heading, style, ...props }: TextProps & { muted?: boolean; heading?: boolean }) {
    return (
        <Text
            {...props}
            accessibilityRole={heading ? "header" : props.accessibilityRole}
            style={[styles.text, muted && styles.muted, heading && styles.heading, style]}
        />
    );
}


export function Page({
                         title,
                         subtitle,
                         back,
                         action,
                         children,
                     }: {
    title: string;
    subtitle?: string;
    back?: boolean;
    action?: ReactNode;
    children: ReactNode;
}) {
    const online = useOnline();
    const route = `/${useRoute().name}`;
    const screen = (
        <SafeAreaView
            onLayout={() => {
                recordNavigationTiming("screen-layout", route);
                observeNavigationFrame(route);
            }}
            edges={["top", "left", "right"]}
            style={commonStyles.screen}
        >
            <View style={styles.header}>
                {back && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        hitSlop={8}
                        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
                        style={styles.back}
                    >
                        <ArrowLeft size={22} color={colors.text}/>
                    </Pressable>
                )}
                <View style={{ flex: 1 }}>
                    <AppText heading>{title}</AppText>
                    {subtitle && (
                        <AppText muted style={{ fontSize: 12 }}>
                            {subtitle}
                        </AppText>
                    )}
                </View>
                {action}
            </View>
            {!online && (
                <AppText
                    accessibilityRole="alert"
                    style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.secondary }}
                >
                    You’re offline. Reconnect to save changes or load more.
                </AppText>
            )}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                {children}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
    return navigationTimingEnabled ? (
        <Profiler
            id={route}
            onRender={(_id, phase, actualDuration) => recordNavigationTiming(`react-${phase}`, route, actualDuration)}
        >
            {screen}
        </Profiler>
    ) : (
        screen
    );
}


export function Content({ children, refreshControl }: { children: ReactNode; refreshControl?: React.ReactElement }) {
    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            contentContainerStyle={styles.content}
        >
            {children}
        </ScrollView>
    );
}


export function Section({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
    return (
        <View style={{ gap: 12 }}>
            {title && (
                <View style={styles.sectionHeading}>
                    <AppText heading style={{ fontSize: 17 }}>
                        {title}
                    </AppText>
                    {action}
                </View>
            )}
            <View style={styles.card}>{children}</View>
        </View>
    );
}


export function Button({
                           label,
                           onPress,
                           pending,
                           disabled,
                           secondary,
                           danger,
                       }: {
    label: string;
    onPress: () => void;
    pending?: boolean;
    disabled?: boolean;
    secondary?: boolean;
    danger?: boolean;
}) {
    const online = useOnline();
    return (
        <NativeHost
            matchContents
            style={{ alignSelf: "flex-start", maxWidth: "100%" }}
            accessibilityState={{ disabled: disabled || pending || !online, busy: pending }}
            seedColor={danger ? colors.error : colors.accent}
        >
            <NativeButton
                label={pending ? `${label}…` : label}
                onPress={onPress}
                disabled={disabled || pending || !online}
                variant={secondary ? "outlined" : "filled"}
            />
        </NativeHost>
    );
}


export function Field({
                          label,
                          inputRef,
                          value,
                          onChangeText,
                          style,
                          ...props
                      }: Omit<TextInputProps, "value" | "ref"> & { label: string; value: string; inputRef?: Ref<TextInputRef> }) {
    const text = useNativeState(value);
    const lastNativeValue = useRef(value);
    // Native typing already updates the observable. Only push external changes
    // (such as clearing a password after save) back into the native field.
    useEffect(() => {
        // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- Synchronize an external form reset with the native control.
        if (lastNativeValue.current !== value) {
            text.set(value);
            lastNativeValue.current = value;
        }
    }, [text, value]);
    return (
        <NativeHost style={{ width: "100%" }}>
            <Column spacing={8}>
                <NativeText>{label}</NativeText>
                <NativeTextInput
                    {...props}
                    ref={inputRef}
                    value={text}
                    placeholder={props.placeholder ?? label}
                    onChangeText={(next) => {
                        lastNativeValue.current = next;
                        onChangeText?.(next);
                    }}
                    style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        ...style,
                    }}
                />
            </Column>
        </NativeHost>
    );
}


export function Select<T extends string>({
                                             label,
                                             value,
                                             options,
                                             onChange,
                                             disabled,
                                         }: {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
    disabled?: boolean;
}) {
    return (
        <NativeHost style={{ width: "100%" }}>
            <Column spacing={8}>
                <NativeText>{label}</NativeText>
                <Picker selectedValue={value} onValueChange={onChange} enabled={!disabled}>
                    {options.map((option) => (
                        <Picker.Item key={option.value} value={option.value} label={option.label}/>
                    ))}
                </Picker>
            </Column>
        </NativeHost>
    );
}


export function MenuRow({
                            title,
                            detail,
                            icon,
                            onPress,
                        }: {
    title: string;
    detail?: string;
    icon?: ReactNode;
    onPress: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [styles.menuRow, pressed && commonStyles.pressed]}
        >
            {icon}
            <View style={{ flex: 1, gap: 3 }}>
                <AppText style={{ fontWeight: "600" }}>{title}</AppText>
                {detail && (
                    <AppText muted style={{ fontSize: 12 }}>
                        {detail}
                    </AppText>
                )}
            </View>
            <ChevronRight size={18} color={colors.muted}/>
        </Pressable>
    );
}


export function StateView({
                              loading,
                              title,
                              message,
                              retry,
                          }: {
    loading?: boolean;
    title?: string;
    message?: string;
    retry?: () => void;
}) {
    return (
        <View style={styles.state}>
            {loading ? (
                <ActivityIndicator size="large" color={colors.accent}/>
            ) : (
                <>
                    {title && (
                        <AppText heading style={{ fontSize: 18, textAlign: "center" }}>
                            {title}
                        </AppText>
                    )}
                    {message && (
                        <AppText muted accessibilityRole={retry ? "alert" : undefined} style={{ textAlign: "center" }}>
                            {message}
                        </AppText>
                    )}
                    {retry && <Button label="Try again" onPress={retry} secondary/>}
                </>
            )}
        </View>
    );
}


export function Cover({ uri, style, label }: { uri: string | null; style?: StyleProp<ViewStyle>; label?: string }) {
    return (
        <View style={[styles.cover, style]}>
            {uri && (
                <Image
                    source={{ uri: assetUrl(uri) }}
                    recyclingKey={uri}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    transition={120}
                    accessibilityLabel={label}
                    style={StyleSheet.absoluteFill}
                />
            )}
        </View>
    );
}


export const uiStyles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    padded: { padding: 16, gap: 16 },
    divider: { height: 1, backgroundColor: colors.border },
});


const styles = StyleSheet.create({
    text: { color: colors.text, fontSize: 14, lineHeight: 21 },
    muted: { color: colors.muted },
    heading: { fontSize: 22, lineHeight: 30, fontWeight: "700" },
    header: {
        paddingHorizontal: 16,
        minHeight: 68,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    back: { minWidth: 40, minHeight: 44, justifyContent: "center" },
    content: { padding: 16, paddingBottom: 40, gap: 24, width: "100%", maxWidth: 760, alignSelf: "center" },
    sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        overflow: "hidden",
    },
    menuRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        minHeight: 60,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    state: { padding: 32, gap: 16, justifyContent: "center", flexGrow: 1 },
    cover: { backgroundColor: colors.secondary, borderRadius: 8, overflow: "hidden", width: 56, height: 82 },
});


export function QueryPanel<T>({
                                  query,
                                  children,
                              }: {
    query: { data: T | undefined; isPending: boolean; error: Error | null; refetch: () => unknown };
    children: (data: T) => ReactNode;
}) {
    if (query.data === undefined)
        return (
            <StateView
                loading={query.isPending}
                title="Couldn’t load this screen"
                message={query.error?.message}
                retry={() => void query.refetch()}
            />
        );
    return (
        <>
            {query.error && (
                <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                        Couldn’t refresh. Showing previously loaded data.
                    </AppText>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => void query.refetch()}
                        style={{ paddingVertical: 8 }}
                    >
                        <AppText style={{ color: colors.accent }}>Try again</AppText>
                    </Pressable>
                </View>
            )}
            {children(query.data)}
        </>
    );
}
