import { useState } from "react";
import { colors } from "../../theme";
import { Alert, View } from "react-native";
import { useIsFocused } from "expo-router";
import { Heart } from "lucide-react-native";
import { mediaLabels } from "../../lib/media";
import { TrackingEditor } from "./TrackingEditor";
import { TopTabs } from "../../components/top-tabs";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { mediaOptions } from "../../lib/react-query/query-options/media.options";
import type { MediaParams, UpdateInput } from "../../lib/api-client";
import { useTrackingMutation } from "../../lib/react-query/query-mutations/media.mutations";
import { AppText, Button, Content, Cover, Page, QueryPanel, Section, uiStyles } from "../../components/ui";

export function MediaScreen() {
    const focused = useIsFocused();
    const [saved, setSaved] = useState(false);
    const [tab, setTab] = useState<"details" | "tracking">("details");
    const params = useLocalSearchParams<{ mediaType: MediaParams["mediaType"]; mediaId: string }>();

    const media = { mediaType: params.mediaType, mediaId: Number(params.mediaId) };
    const mutation = useTrackingMutation(media);
    const query = useQuery({ ...mediaOptions(media), enabled: focused });

    const update = (payload: UpdateInput["payload"], activityCorrection?: UpdateInput["activityCorrection"]) => {
        setSaved(false);
        mutation.mutate(
            { action: "update", input: { payload, activityCorrection } },
            {
                onSuccess: (result) => {
                    if (result.kind === "saved") {
                        setSaved(true);
                        return;
                    }

                    const preview = result.preview;
                    Alert.alert(
                        "Review activity correction",
                        `Reducing progress can change your monthly history.
                     ${preview.months.length} recorded month(s) are available for correction.
                     Keep the history, or adjust it from the most recent month backwards?`,
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Keep history",
                                onPress: () => update(payload, { version: preview.version, keepHistory: true }),
                            },
                            {
                                style: "destructive",
                                text: "Adjust history",
                                onPress: () => update(payload, { version: preview.version }),
                            },
                        ],
                    );
                },
            },
        );
    };

    return (
        <Page title={mediaLabels[media.mediaType] ?? "Media"} back={true}>
            <QueryPanel query={query}>
                {(data) => (
                    <Content>
                        <View style={[uiStyles.row, { alignItems: "flex-start" }]}>
                            <Cover uri={data.media.cover} style={{ width: 108, height: 160 }} />
                            <View style={{ flex: 1, gap: 10 }}>
                                <AppText heading>{data.media.name}</AppText>
                                <AppText muted>{data.media.releaseDate?.slice(0, 4) ?? "Release date unknown"}</AppText>
                                {data.tracking?.favorite && (
                                    <Heart size={20} fill={colors.favorite} color={colors.favorite} />
                                )}
                            </View>
                        </View>
                        {data.media.tagline && (
                            <AppText muted style={{ fontStyle: "italic" }}>
                                {data.media.tagline}
                            </AppText>
                        )}
                        <TopTabs
                            value={tab}
                            tabs={[
                                { value: "details", label: "Details" },
                                { value: "tracking", label: "Your tracking" },
                            ]}
                            onChange={setTab}
                        />
                        {tab === "details" && (
                            <>
                                {data.media.synopsis && (
                                    <Section title="Synopsis">
                                        <AppText muted style={{ padding: 16, lineHeight: 22 }}>
                                            {data.media.synopsis}
                                        </AppText>
                                    </Section>
                                )}
                                <Section title="About this title">
                                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                                        {[
                                            { label: "Released", value: data.media.releaseDate ?? "Unknown" },
                                            ...data.media.facts,
                                        ].map((fact) => (
                                            <View key={fact.label} style={{ width: "50%", padding: 14, gap: 5 }}>
                                                <AppText muted style={{ fontSize: 11 }}>
                                                    {fact.label}
                                                </AppText>
                                                <AppText style={{ fontSize: 13 }}>{fact.value}</AppText>
                                            </View>
                                        ))}
                                    </View>
                                </Section>
                            </>
                        )}
                        {mutation.error && (
                            <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                                {mutation.error.message}
                            </AppText>
                        )}
                        {saved && (
                            <AppText accessibilityRole="alert" style={{ color: colors.accent }}>
                                Changes saved.
                            </AppText>
                        )}
                        {tab === "tracking" &&
                            (data.tracking ? (
                                <>
                                    <TrackingEditor data={data} pending={mutation.isPending} update={update} />
                                    <Button
                                        danger={true}
                                        pending={mutation.isPending}
                                        label="Remove from your list"
                                        onPress={() =>
                                            Alert.alert(
                                                "Remove from your list?",
                                                "Your rating, notes, progress, and tracking history for this title will be removed.",
                                                [
                                                    { text: "Cancel", style: "cancel" },
                                                    {
                                                        text: "Remove",
                                                        style: "destructive",
                                                        onPress: () => {
                                                            setSaved(false);
                                                            mutation.mutate({ action: "remove" });
                                                        },
                                                    },
                                                ],
                                            )
                                        }
                                    />
                                </>
                            ) : data.active ? (
                                <Button
                                    label="Add to your list"
                                    pending={mutation.isPending}
                                    onPress={() => mutation.mutate({ action: "add" })}
                                />
                            ) : (
                                <AppText muted>
                                    Activate this media list in content settings before adding titles.
                                </AppText>
                            ))}
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}
