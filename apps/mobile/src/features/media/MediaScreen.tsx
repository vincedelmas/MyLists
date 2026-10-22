import { useState } from "react";
import { Alert } from "react-native";
import { useIsFocused } from "expo-router";
import { Info, UsersRound, BookmarkCheck, Pencil } from "lucide-react-native";
import { mediaLabels } from "../../lib/media";
import { CollapsingTabs } from "../../components/collapsing-tabs";
import { MediaHero } from "./MediaHero";
import { MediaDetailsContent } from "./MediaDetailsContent";
import { MediaCommunityContent } from "./MediaCommunityContent";
import { MediaTrackingContent } from "./MediaTrackingContent";
import { MediaEditContent } from "./MediaEditContent";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { mediaOptions } from "../../lib/react-query/query-options/media.options";
import type { MediaParams, UpdateInput } from "../../lib/api-client";
import { useTrackingMutation } from "../../lib/react-query/query-mutations/media.mutations";
import { Page, QueryPanel } from "../../components/ui";

export function MediaScreen() {
    const focused = useIsFocused();
    const [saved, setSaved] = useState(false);
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
        <Page title={mediaLabels[media.mediaType] ?? "Media"} brand back>
            <QueryPanel query={query}>
                {(data) => (
                    <CollapsingTabs
                        key={`${media.mediaType}:${media.mediaId}`}
                        initialTab="details"
                        tabs={[
                            { value: "details", label: "Details", icon: Info },
                            { value: "community", label: "Community", icon: UsersRound },
                            { value: "tracking", label: "Tracking", icon: BookmarkCheck },
                            ...(data.canEdit ? [{ value: "edit", label: "Edit", icon: Pencil }] : []),
                        ]}
                        header={<MediaHero data={data} />}
                    >
                        {(tab) => (
                            <>
                                {tab === "details" && (
                                    <MediaDetailsContent
                                        params={media}
                                        data={data}
                                        refetch={query.refetch}
                                        refreshing={query.isRefetching}
                                    />
                                )}
                                {tab === "community" && <MediaCommunityContent params={media} />}
                                {tab === "tracking" && (
                                    <MediaTrackingContent
                                        params={media}
                                        data={data}
                                        pending={mutation.isPending}
                                        saved={saved}
                                        error={mutation.error?.message}
                                        update={update}
                                        add={() => {
                                            setSaved(false);
                                            mutation.mutate({ action: "add" });
                                        }}
                                        remove={() => {
                                            setSaved(false);
                                            mutation.mutate({ action: "remove" });
                                        }}
                                        refetch={query.refetch}
                                        refreshing={query.isRefetching}
                                    />
                                )}
                                {tab === "edit" && data.canEdit && <MediaEditContent params={media} />}
                            </>
                        )}
                    </CollapsingTabs>
                )}
            </QueryPanel>
        </Page>
    );
}
