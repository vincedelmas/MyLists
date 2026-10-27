import {useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {StyleSheet, Animated, RefreshControl, View} from "react-native";
import {History, Image, Tags, Trash2} from "lucide-react-native";
import {Switch} from "@expo/ui";
import {uiStyles, AppText, Button, MenuRow, QueryPanel, Section} from "../../components/ui";
import {NativeHost} from "../../components/native-host";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {useConfirmation} from "../../hooks/use-confirmation";
import {TrackingEditor} from "./TrackingEditor";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {useTabPush} from "../../hooks/use-tab-push";
import {mediaCollectionsOptions} from "../../lib/react-query/query-options/media.options";
import type {MediaParams, MobileMedia, UpdateInput} from "../../lib/api-client";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {formatDate} from "@/lib/utils/formatting/date";
import {MediaMemberships} from "./media-memberships";
import {MediaCoverSheet} from "./media-cover-sheet";
import {MediaHistorySheet} from "./media-history-sheet";
import {useMediaAction} from "./use-media-action";
import {colors} from "../../theme";


export function MediaTrackingContent({ params, data, pending, saved, error, correcting, update, add, remove, refetch, refreshing }: {
    params: MediaParams; data: MobileMedia; pending: boolean; correcting: boolean; saved: boolean; error?: string;
    update: (payload: UpdateInput["payload"], onSaved?: () => void) => void; add: () => void; remove: (onSaved: () => void) => void; refetch: () => unknown; refreshing: boolean;
}) {
    const focused = useIsFocused();
    const memberships = useQuery({ ...mediaCollectionsOptions(params), enabled: focused });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const push = useTabPush();
    const [sheet, setSheet] = useState<"tags" | "collections" | "cover" | "history" | null>(null);
    const { confirmation, confirm, dismiss } = useConfirmation();
    const preferences = useMediaAction(params);
    const collections = memberships.data?.filter(item => item.hasMedia) ?? [];

    return (
        <>
            <Animated.FlatList
                {...scrollProps}
                data={collections}
                keyExtractor={item => String(item.id)}
                contentInsetAdjustmentBehavior="automatic"
                renderItem={({ item }) =>
                    <MenuRow
                        title={item.title}
                        detail={`${item.itemsCount} titles · ${item.privacy}`}
                        onPress={() => push({
                            pathname: "/library/[kind]",
                            params: { kind: "collection", id: item.id }
                        })}
                    />
                }
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                    styles.content,
                    contentContainerStyle
                ]}
                initialNumToRender={8}
                windowSize={7}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        refreshing={refreshing}
                        onRefresh={() => {
                            refetch();
                            void memberships.refetch();
                        }}
                    />
                }
                ListHeaderComponent={
                    <View style={styles.trackingSections}>
                        {error &&
                            <AppText
                                accessibilityRole="alert"
                                style={styles.errorText}
                            >
                                {error}
                            </AppText>
                        }
                        {saved &&
                            <AppText
                                accessibilityRole="alert"
                                style={styles.successText}
                            >
                                Changes saved.
                            </AppText>
                        }
                        {data.tracking && data.active
                            ? <>
                                <TrackingEditor
                                    data={data}
                                    update={update}
                                    pending={pending}
                                    error={error}
                                    correcting={correcting}
                                />
                                <Section title="Organize & personalize">
                                    <MenuRow
                                        title="Tracking history"
                                        detail="Review or delete your updates"
                                        icon={
                                            <History size={18} color={colors.accent}/>
                                        }
                                        onPress={() => setSheet("history")}
                                    />
                                    <MenuRow
                                        title="Tags"
                                        detail={data.tracking.tags.map(tag => `#${tag.name}`).join(" · ") || "Add tags to organize your list"}
                                        icon={
                                            <Tags size={18} color={colors.accent}/>
                                        }
                                        onPress={() => setSheet("tags")}
                                    />
                                    <MenuRow
                                        title="Custom cover"
                                        detail={data.tracking.customCover ? "Using your custom cover" : "Choose your own cover"}
                                        icon={
                                            <Image size={18} color={colors.accent}/>
                                        }
                                        onPress={() => setSheet("cover")}
                                    />
                                    {getMediaDefinition(params.mediaType).releaseNotifications &&
                                        <View style={styles.notificationPreference}>
                                            <NativeHost>
                                                <Switch
                                                    label="Release notifications"
                                                    value={data.tracking.releaseNotificationsEnabled}
                                                    disabled={preferences.isPending}
                                                    onValueChange={enabled => preferences.mutate({
                                                        action: "notifications",
                                                        enabled
                                                    })}
                                                />
                                            </NativeHost>
                                            <AppText
                                                muted
                                                style={styles.notificationHelp}
                                            >
                                                Notify me about upcoming releases. Your media type’s setting
                                                must also be enabled.
                                            </AppText>
                                            {preferences.error &&
                                                <AppText
                                                    accessibilityRole="alert"
                                                    style={styles.errorText}
                                                >
                                                    {preferences.error.message}
                                                </AppText>
                                            }
                                        </View>
                                    }
                                </Section>
                            </>
                            : data.active
                                ? <Section title="Start tracking">
                                    <View style={uiStyles.padded}>
                                        <AppText muted>
                                            Keep your progress, rating and comments
                                            here.
                                        </AppText>
                                        <Button
                                            fullWidth
                                            label="Add to your list"
                                            pending={pending}
                                            onPress={add}
                                        />
                                    </View>
                                </Section>
                                :
                                <AppText muted>
                                    Activate this media list in content settings before adding titles.
                                </AppText>
                        }
                        <View
                            style={styles.collectionsHeading}
                        >
                            <AppText
                                heading
                                style={styles.sectionTitle}
                            >
                                Your
                                collections
                            </AppText>
                            <Button
                                secondary
                                label="Manage"
                                onPress={() => setSheet("collections")}
                            />
                        </View>
                        <QueryPanel query={memberships}>
                            {() => !collections.length
                                ? <AppText muted>
                                    Not added to a collection yet.
                                </AppText>
                                : null
                            }
                        </QueryPanel>
                    </View>
                }
                ListFooterComponent={data.tracking
                    ? <View style={styles.trackingActions}>
                        {data.tracking.addedAt &&
                            <AppText
                                muted
                                style={styles.addedAt}
                            >Added {formatDate(data.tracking.addedAt)}</AppText>
                        }
                        <Button
                            fullWidth
                            secondary
                            danger
                            label="Remove from your list"
                            pending={pending}
                            onPress={() => confirm({
                                title: "Remove from your list?",
                                message: "Your rating, comments, progress and tracking history for this title will be removed.",
                                label: "Remove",
                                icon: Trash2,
                                closeOnConfirm: false,
                                onConfirm: () => remove(dismiss)
                            })}
                        />
                    </View>
                    : undefined
                }
            />
            {(sheet === "tags" || sheet === "collections") &&
                <MediaMemberships
                    params={params}
                    data={data}
                    kind={sheet}
                    dismiss={() => setSheet(null)}
                />
            }
            {sheet === "cover" &&
                <MediaCoverSheet
                    params={params}
                    data={data}
                    dismiss={() => setSheet(null)}
                />
            }
            {sheet === "history" &&
                <MediaHistorySheet
                    params={params}
                    data={data}
                    dismiss={() => setSheet(null)}
                />
            }
            <ConfirmationSheet
                confirmation={confirmation}
                dismiss={dismiss}
                pending={pending}
                error={error}
            />
        </>
    );
}


const styles = StyleSheet.create({
    content: { padding: 16, paddingBottom: 32 },
    trackingSections: { gap: 24, paddingBottom: 12 },
    errorText: { color: colors.error },
    successText: { color: colors.accent },
    notificationPreference: { padding: 16, gap: 8 },
    notificationHelp: { fontSize: 12, lineHeight: 18 },
    collectionsHeading: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
    },
    sectionTitle: { fontSize: 18 },
    trackingActions: { gap: 16, paddingTop: 24 },
    addedAt: { fontSize: 12 },
});
