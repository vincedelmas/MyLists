import {memo, useState} from "react";
import {useIsFocused} from "expo-router";
import {FlatList, Pressable, StyleSheet, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import type {api} from "../../lib/api-client";
import {ContinueActions} from "./ContinueActions";
import {colors} from "../../theme";
import {useTabPush} from "../../hooks/use-tab-push";
import {AppText, Cover, QueryPanel} from "../../components/ui";
import {profileContinueOptions} from "../../lib/react-query/query-options/profile.options";

export function ProfileContinue({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const push = useTabPush();
    const query = useQuery({ ...profileContinueOptions(userId), enabled: focused });

    if (query.data && "showPreview" in query.data && !query.data.showPreview) return null;

    return (
        <View style={{ gap: 12 }}>
            <View style={styles.heading}>
                <AppText heading style={{ fontSize: 17 }}>
                    Continue
                </AppText>
                {!userId && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="View all titles to continue"
                        hitSlop={8}
                        onPress={() => push({ pathname: "/library/[kind]", params: { kind: "continue", userId } })}
                    >
                        <AppText style={{ fontSize: 12, color: colors.accent }}>View all</AppText>
                    </Pressable>
                )}
            </View>
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
    items: Awaited<ReturnType<typeof api.libraryDetail>>["items"];
}) {
    const push = useTabPush();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = items.find(item => `${item.mediaType}:${item.mediaId}` === selectedId);
    return (
        <>
            <FlatList
                horizontal
                data={items.slice(0, 8)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
                keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
                renderItem={({ item }) => (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Continue ${item.name}`}
                        onPress={() => readOnly ?
                            push({
                                pathname: "/media/[mediaType]/[mediaId]",
                                params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                            }) : setSelectedId(`${item.mediaType}:${item.mediaId}`)
                        }
                        style={({ pressed }) => [styles.card, pressed && { opacity: 0.6 }]}
                    >
                        <Cover uri={item.cover} label={item.name} style={styles.cover}/>
                        <AppText numberOfLines={2} style={{ fontSize: 12, fontWeight: "600" }}>
                            {item.name}
                        </AppText>
                    </Pressable>
                )}
            />
            {selected && <ContinueActions item={selected} dismiss={() => setSelectedId(null)}/>}
        </>
    );
});

const styles = StyleSheet.create({
    heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    card: { width: 112, gap: 8 },
    cover: { width: "100%", height: undefined, aspectRatio: 0.67, alignSelf: "flex-start" },
});
