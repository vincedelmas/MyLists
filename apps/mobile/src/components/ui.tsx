import {Image} from "expo-image";
import brandLogo from "../../../../public/logo192.png";
import {router} from "expo-router";
import {NativeHost} from "./native-host";
import {SelectControl} from "./select-control";
import type {SelectControlProps} from "./select-control.types";
import {assetUrl} from "../lib/api-client";
import {useOnline} from "../hooks/use-online";
import {colors, commonStyles} from "../theme";
import {useRoute} from "expo-router/react-navigation";
import {SafeAreaView} from "react-native-safe-area-context";
import {ArrowLeft, ChevronRight, X} from "lucide-react-native";
import {Profiler, useEffect, useRef, type ReactNode, type Ref} from "react";
import {
    navigationTimingEnabled,
    recordNavigationTiming,
    observeNavigationFrame,
} from "../lib/diagnostics/navigation-timing";
import {
    Button as NativeButton,
    Column,
    Text as NativeText,
    TextInput as NativeTextInput,
    useNativeState,
    type TextInputProps,
    type TextInputRef,
} from "@expo/ui";
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
    type ViewProps,
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
                         brand = false,
                         hideHeader = false,
                     }: {
    title: string;
    brand?: boolean;
    hideHeader?: boolean;
    back?: boolean;
    subtitle?: string;
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
            {!hideHeader && (
                <View style={[styles.header, brand && styles.compactHeader]}>
                    {back && (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                            hitSlop={8}
                            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/(profile)"))}
                            style={styles.back}
                        >
                            <ArrowLeft size={22} color={colors.text}/>
                        </Pressable>
                    )}
                    {brand && <Image source={brandLogo} style={styles.logo}/>}
                    <View style={styles.fill}>
                        <AppText heading style={brand ? styles.brandTitle : undefined}>
                            {title}
                        </AppText>
                        {subtitle && (
                            <AppText muted style={styles.caption}>
                                {subtitle}
                            </AppText>
                        )}
                    </View>
                    {action}
                </View>
            )}
            {!online && (
                <AppText
                    accessibilityRole="alert"
                    style={styles.offline}
                >
                    You’re offline. Reconnect to save changes or load more.
                </AppText>
            )}
            <KeyboardAvoidingView style={styles.fill} behavior={Platform.select({ ios: "padding" as const, android: "height" as const })}>
                {children}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );

    return navigationTimingEnabled ? (
        <Profiler
            id={route}
            onRender={(_id, phase, actualDuration) => {
                recordNavigationTiming(`react-${phase}`, route, actualDuration);
                recordNavigationTiming(`screen-render:${route}:${phase}`, undefined, actualDuration);
            }}
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
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
        >
            {children}
        </ScrollView>
    );
}

export function Section({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
    return (
        <View style={styles.section}>
            {title && (
                <View style={styles.sectionHeading}>
                    <AppText heading style={styles.sectionTitle}>
                        {title}
                    </AppText>
                    {action}
                </View>
            )}

            <Card>{children}</Card>
        </View>
    );
}

export function Card({ style, ...props }: ViewProps) {
    return <View {...props} style={[styles.card, style]}/>;
}

export function Button({
                           label,
                           onPress,
                           pending,
                           disabled,
                           secondary,
                           danger,
                           width,
                       }: {
    label: string;
    danger?: boolean;
    width?: number;
    pending?: boolean;
    disabled?: boolean;
    secondary?: boolean;
    onPress: () => void;
}) {
    const online = useOnline();

    return (
        <NativeHost
            matchContents
            seedColor={danger ? colors.error : colors.accent}
            style={styles.buttonHost}
            accessibilityState={{ disabled: disabled || pending || !online, busy: pending }}
        >
            <NativeButton
                onPress={onPress}
                label={pending ? `${label}…` : label}
                disabled={disabled || pending || !online}
                variant={secondary ? "outlined" : "filled"}
                style={width ? { width } : undefined}
            />
        </NativeHost>
    );
}

export function Field({
                          label,
                          hideLabel,
                          leadingIcon,
                          clearable,
                          inputRef,
                          value,
                          onChangeText,
                          style,
                          ...props
                      }: Omit<TextInputProps, "value" | "ref"> & {
    label: string;
    hideLabel?: boolean;
    leadingIcon?: ReactNode;
    value: string;
    inputRef?: Ref<TextInputRef>;
    clearable?: boolean;
}) {
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
        <View style={styles.fullWidth}>
            <NativeHost style={styles.fullWidth}>
                <Column spacing={8}>
                    {!hideLabel && <NativeText>{label}</NativeText>}
                    <NativeTextInput
                        {...props}
                        value={text}
                        ref={inputRef}
                        placeholder={props.placeholder ?? label}
                        onChangeText={(next) => {
                            lastNativeValue.current = next;
                            onChangeText?.(next);
                        }}
                        style={{
                            padding: 12,
                            ...(leadingIcon ? { paddingLeft: 48 } : {}),
                            ...(clearable ? { paddingRight: 48 } : {}),
                            borderWidth: 1,
                            borderRadius: 8,
                            borderColor: colors.border,
                            ...style,
                        }}
                    />
                </Column>
            </NativeHost>
            {leadingIcon && <View pointerEvents="none"
                                  style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>{leadingIcon}</View>}
            {clearable && value.length > 0 && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Clear ${label.toLowerCase()}`}
                    onPress={() => {
                        text.set("");
                        lastNativeValue.current = "";
                        onChangeText?.("");
                    }}
                    style={({ pressed }) => ({
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        width: 44,
                        height: 48,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.6 : 1
                    })}
                >
                    <X size={18} color={colors.muted}/>
                </Pressable>
            )}
        </View>
    );
}

export function Select<T extends string>({ label, ...props }: SelectControlProps<T> & { label: string }) {
    return (
        <NativeHost style={styles.fullWidth}>
            <Column spacing={8}>
                <NativeText textStyle={{ fontSize: 12, color: colors.muted }}>{label}</NativeText>
                <SelectControl {...props} />
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
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.menuRow, pressed && commonStyles.pressed]}
        >
            {icon}
            <View style={styles.menuText}>
                <AppText style={styles.semibold}>{title}</AppText>
                {detail && (
                    <AppText muted style={styles.caption}>
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
    title?: string;
    message?: string;
    loading?: boolean;
    retry?: () => void;
}) {
    return (
        <View style={styles.state}>
            {loading ? (
                <ActivityIndicator size="large" color={colors.accent}/>
            ) : (
                <>
                    {title && (
                        <AppText heading style={styles.stateTitle}>
                            {title}
                        </AppText>
                    )}

                    {message && (
                        <AppText muted accessibilityRole={retry ? "alert" : undefined} style={styles.centerText}>
                            {message}
                        </AppText>
                    )}

                    {retry && <Button label="Try again" onPress={retry} secondary/>}
                </>
            )}
        </View>
    );
}

export function Cover({
                          uri,
                          style,
                          label,
                          pointerEvents,
                      }: {
    uri: string | null;
    style?: StyleProp<ViewStyle>;
    label?: string;
    pointerEvents?: ViewProps["pointerEvents"];
}) {
    return (
        <View pointerEvents={pointerEvents} style={[styles.cover, style]}>
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
    padded: { padding: 16, gap: 16 },
});

const styles = StyleSheet.create({
    compactHeader: { minHeight: 48, paddingVertical: 4 },
    logo: { width: 28, height: 28 },
    fill: { flex: 1 },
    brandTitle: { fontSize: 18 },
    caption: { fontSize: 12 },
    offline: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.secondary },
    section: { gap: 12 },
    sectionTitle: { fontSize: 17 },
    buttonHost: { alignSelf: "flex-start", maxWidth: "100%" },
    fullWidth: { width: "100%" },
    menuText: { flex: 1, gap: 3 },
    semibold: { fontWeight: "600" },
    stateTitle: { fontSize: 18, textAlign: "center" },
    centerText: { textAlign: "center" },
    refreshError: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    error: { color: colors.error },
    retry: { paddingVertical: 8 },
    accent: { color: colors.accent },

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
                <View style={styles.refreshError}>
                    <AppText accessibilityRole="alert" style={styles.error}>
                        Couldn’t refresh. Showing previously loaded data.
                    </AppText>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => void query.refetch()}
                        style={styles.retry}
                    >
                        <AppText style={styles.accent}>Try again</AppText>
                    </Pressable>
                </View>
            )}
            {children(query.data)}
        </>
    );
}
