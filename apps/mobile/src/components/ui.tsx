import {useState, type ReactNode, type Ref} from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Keyboard,
    useWindowDimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type TextInputProps,
    type TextInputInstance,
    type TextProps,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {ArrowLeft, Check, ChevronRight, X} from "lucide-react-native";
import {router} from "expo-router";
import {Image} from "expo-image";
import {colors, commonStyles} from "../theme";
import {useOnline} from "../lib/use-online";
import {assetUrl} from "../lib/api-client";

export function AppText({muted, heading, style, ...props}: TextProps & {muted?: boolean; heading?: boolean}) {
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
    return (
        <SafeAreaView edges={["top", "left", "right"]} style={commonStyles.screen}>
            <View style={styles.header}>
                {back && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        hitSlop={8}
                        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
                        style={styles.back}
                    >
                        <ArrowLeft size={22} color={colors.text} />
                    </Pressable>
                )}
                <View style={{flex: 1}}>
                    <AppText heading>{title}</AppText>
                    {subtitle && (
                        <AppText muted style={{fontSize: 12}}>
                            {subtitle}
                        </AppText>
                    )}
                </View>
                {action}
            </View>
            {!online && (
                <AppText
                    accessibilityRole="alert"
                    style={{paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.secondary}}
                >
                    You’re offline. Reconnect to save changes or load more.
                </AppText>
            )}
            <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                {children}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export function Content({children, refreshControl}: {children: ReactNode; refreshControl?: React.ReactElement}) {
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

export function Section({title, children, action}: {title?: string; children: ReactNode; action?: ReactNode}) {
    return (
        <View style={{gap: 12}}>
            {title && (
                <View style={styles.sectionHeading}>
                    <AppText heading style={{fontSize: 17}}>
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
        <Pressable
            accessibilityRole="button"
            accessibilityState={{disabled: disabled || pending || !online, busy: pending}}
            disabled={disabled || pending || !online}
            onPress={onPress}
            style={({pressed}) => [
                commonStyles.button,
                secondary && {backgroundColor: colors.secondary},
                danger && {backgroundColor: "#65282B"},
                pressed && commonStyles.pressed,
                (disabled || pending || !online) && commonStyles.disabled,
            ]}
        >
            {pending ? (
                <ActivityIndicator color={colors.text} />
            ) : (
                <AppText style={commonStyles.buttonText}>{label}</AppText>
            )}
        </Pressable>
    );
}

export function Field({
    label,
    inputRef,
    ...props
}: TextInputProps & {label: string; inputRef?: Ref<TextInputInstance>}) {
    return (
        <View style={{gap: 8}}>
            <AppText style={{fontWeight: "600"}}>{label}</AppText>
            <TextInput
                ref={inputRef}
                {...props}
                accessibilityLabel={label}
                placeholderTextColor={colors.muted}
                selectionColor={colors.accent}
                style={[styles.input, props.multiline && {minHeight: 100, textAlignVertical: "top"}, props.style]}
            />
        </View>
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
    options: readonly {value: T; label: string}[];
    onChange: (value: T) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const {height} = useWindowDimensions();
    return (
        <View style={{gap: 8}}>
            <AppText style={{fontWeight: "600"}}>{label}</AppText>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${options.find((option) => option.value === value)?.label ?? value}`}
                disabled={disabled}
                onPress={() => {
                    Keyboard.dismiss();
                    setOpen(true);
                }}
                style={[styles.input, styles.select, disabled && commonStyles.disabled]}
            >
                <AppText style={{flex: 1}}>{options.find((option) => option.value === value)?.label ?? value}</AppText>
                <ChevronRight size={18} color={colors.muted} />
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={styles.modal}>
                    <Pressable
                        accessibilityLabel="Close selection"
                        accessibilityRole="button"
                        style={{flex: 1}}
                        onPress={() => setOpen(false)}
                    />
                    <SafeAreaView
                        style={[styles.sheet, {height: Math.min(options.length * 56 + 112, height * 0.75)}]}
                        edges={["bottom"]}
                    >
                        <View style={styles.sectionHeading}>
                            <AppText heading>{label}</AppText>
                            <Pressable
                                accessibilityLabel="Close selection"
                                accessibilityRole="button"
                                hitSlop={12}
                                onPress={() => setOpen(false)}
                            >
                                <X color={colors.text} size={22} />
                            </Pressable>
                        </View>
                        <FlatList
                            style={{flex: 1}}
                            data={options}
                            keyExtractor={(item) => item.value}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({item}) => (
                                <Pressable
                                    accessibilityRole="radio"
                                    accessibilityState={{checked: item.value === value}}
                                    onPress={() => {
                                        onChange(item.value);
                                        setOpen(false);
                                    }}
                                    style={styles.option}
                                >
                                    <AppText style={{flex: 1}}>{item.label}</AppText>
                                    {item.value === value && <Check size={20} color={colors.accent} />}
                                </Pressable>
                            )}
                        />
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
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
            style={({pressed}) => [styles.menuRow, pressed && commonStyles.pressed]}
        >
            {icon}
            <View style={{flex: 1, gap: 3}}>
                <AppText style={{fontWeight: "600"}}>{title}</AppText>
                {detail && (
                    <AppText muted style={{fontSize: 12}}>
                        {detail}
                    </AppText>
                )}
            </View>
            <ChevronRight size={18} color={colors.muted} />
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
                <ActivityIndicator size="large" color={colors.accent} />
            ) : (
                <>
                    {title && (
                        <AppText heading style={{fontSize: 18, textAlign: "center"}}>
                            {title}
                        </AppText>
                    )}
                    {message && (
                        <AppText muted accessibilityRole={retry ? "alert" : undefined} style={{textAlign: "center"}}>
                            {message}
                        </AppText>
                    )}
                    {retry && <Button label="Try again" onPress={retry} secondary />}
                </>
            )}
        </View>
    );
}

export function Cover({uri, style, label}: {uri: string | null; style?: StyleProp<ViewStyle>; label?: string}) {
    return (
        <View style={[styles.cover, style]}>
            {uri && (
                <Image
                    source={{uri: assetUrl(uri)}}
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
    row: {flexDirection: "row", alignItems: "center", gap: 12},
    padded: {padding: 16, gap: 16},
    divider: {height: 1, backgroundColor: colors.border},
});

const styles = StyleSheet.create({
    text: {color: colors.text, fontSize: 14, lineHeight: 21},
    muted: {color: colors.muted},
    heading: {fontSize: 22, lineHeight: 30, fontWeight: "700"},
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
    back: {minWidth: 40, minHeight: 44, justifyContent: "center"},
    content: {padding: 16, paddingBottom: 40, gap: 24, width: "100%", maxWidth: 760, alignSelf: "center"},
    sectionHeading: {flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12},
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        overflow: "hidden",
    },
    input: {
        color: colors.text,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        minHeight: 48,
    },
    select: {flexDirection: "row", alignItems: "center", gap: 8},
    modal: {flex: 1, backgroundColor: "#0008"},
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 16,
        maxHeight: "75%",
    },
    option: {
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
    state: {padding: 32, gap: 16, justifyContent: "center", flexGrow: 1},
    cover: {backgroundColor: colors.secondary, borderRadius: 8, overflow: "hidden", width: 56, height: 82},
});

export function QueryPanel<T>({
    query,
    children,
}: {
    query: {data: T | undefined; isPending: boolean; error: Error | null; refetch: () => unknown};
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
                <View style={{padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border}}>
                    <AppText accessibilityRole="alert" style={{color: colors.error}}>
                        Couldn’t refresh. Showing previously loaded data.
                    </AppText>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => void query.refetch()}
                        style={{paddingVertical: 8}}
                    >
                        <AppText style={{color: colors.accent}}>Try again</AppText>
                    </Pressable>
                </View>
            )}
            {children(query.data)}
        </>
    );
}
