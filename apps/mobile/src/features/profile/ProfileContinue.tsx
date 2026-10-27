import {memo, useState} from "react";
import {useIsFocused} from "expo-router";
import {FlatList, Pressable, StyleSheet, View, useWindowDimensions} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {ContinueActions} from "./ContinueActions";
import {colors} from "../../theme";
import {useTabPush} from "../../hooks/use-tab-push";
import {AppText, Cover, QueryPanel} from "../../components/ui";
import {SectionHeading} from "../../components/section-heading";
import {ProgressBar} from "../../components/ProgressBar";
import {ChevronRight} from "lucide-react-native";
import {mediaColors, mediaIcons, mediaLabels} from "../../lib/media";
import {profileContinueOptions, type ProfileContinueData} from "../../lib/react-query/query-options/profile.options";

export function ProfileContinue({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const push = useTabPush();
    const query = useQuery({ ...profileContinueOptions(userId), enabled: focused });

    if (query.data && !query.data.showPreview) return null;

    return (
        <View style={{ gap: 12 }}>
            <SectionHeading title={userId ? "In progress" : "Continue"} action={!userId ? {
                label: "View all",
                accessibilityLabel: "View all titles to continue",
                onPress: () => push({ pathname: "/library/[kind]", params: { kind: "continue", userId } }),
            } : undefined}/>
            <QueryPanel query={query}>
                {(data) =>
                    data.items.length ? (
                        <ContinueCards items={data.items} readOnly={!!userId}/>
                    ) : (
                        <AppText muted style={{ fontSize: 12 }}>
                            Titles in progress will appear here.
                        </AppText>
                    )
                }
            </QueryPanel>
        </View>
    );
}

const ContinueCards = memo(function ContinueCards({
                                                      items,
                                                      readOnly,
                                                  }: {
    readOnly: boolean;
    items: ProfileContinueData["items"];
}) {
    const push = useTabPush();
    const { width } = useWindowDimensions();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = items.find(item => `${item.mediaType}:${item.mediaId}` === selectedId);
    return (
        <>
            <FlatList
                horizontal
                data={items.slice(0, 8)}
                showsHorizontalScrollIndicator={false}
                initialNumToRender={2}
                maxToRenderPerBatch={3}
                windowSize={5}
                contentContainerStyle={{ gap: 12 }}
                keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
                renderItem={({ item }) => {
                    const Icon = mediaIcons[item.mediaType];
                    const color = mediaColors[item.mediaType];
                    return <Pressable accessibilityRole="button"
                                      accessibilityLabel={`${readOnly ? "View" : "Continue"} ${item.name}, ${item.progress.label}`}
                                      accessibilityHint={readOnly ? undefined : "Long press to update progress"}
                                      accessibilityActions={readOnly ? undefined : [{ name: "continue", label: "Update progress" }]}
                                      onAccessibilityAction={event => {
                                          if (!readOnly && event.nativeEvent.actionName === "continue") setSelectedId(`${item.mediaType}:${item.mediaId}`);
                                      }}
                                      onLongPress={readOnly ? undefined : () => setSelectedId(`${item.mediaType}:${item.mediaId}`)}
                                      onPress={() => push({ pathname: "/media/[mediaType]/[mediaId]", params: { mediaType: item.mediaType, mediaId: String(item.mediaId) } })}
                                      style={({ pressed }) => [styles.card, { width: Math.min(320, width - 64) }, pressed && styles.pressed]}>
                        <Cover uri={item.cover} label={item.name} style={styles.cover}/>
                        <View style={styles.details}>
                            <View style={styles.mediaType}><Icon size={12} color={color}/><AppText
                                style={[styles.typeLabel, { color }]}>{mediaLabels[item.mediaType]}</AppText></View>
                            <AppText numberOfLines={2} style={styles.title}>{item.name}</AppText>
                            <AppText muted numberOfLines={2} style={styles.progressLabel}>{item.progress.label}</AppText>
                            {item.progress.total !== null && item.progress.total > 0 &&
                                <ProgressBar value={Math.min(100, item.progress.value / item.progress.total * 100)} color={color}/>}
                            <View style={styles.cardAction}><AppText numberOfLines={1}
                                                                     style={styles.actionLabel}>{readOnly ? "View details" : item.progress.actionLabel}</AppText><ChevronRight
                                size={13} color={colors.accent}/></View>
                        </View>
                    </Pressable>;
                }}
            />
            {selected && <ContinueActions item={selected} dismiss={() => setSelectedId(null)}/>}
        </>
    );
});

const styles = StyleSheet.create({
    card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    cover: { width: 64, height: 96, borderRadius: 9 },
    details: { flex: 1, minWidth: 0, gap: 7 },
    mediaType: { flexDirection: "row", alignItems: "center", gap: 4 },
    typeLabel: { fontSize: 10, lineHeight: 15, fontWeight: "500" },
    title: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    progressLabel: { fontSize: 11, lineHeight: 16 },
    cardAction: { flexDirection: "row", alignItems: "center", gap: 3, paddingTop: 1 },
    actionLabel: { fontSize: 11, lineHeight: 16, fontWeight: "500", color: colors.accent, flexShrink: 1 },
    pressed: { opacity: 0.6 },
});
