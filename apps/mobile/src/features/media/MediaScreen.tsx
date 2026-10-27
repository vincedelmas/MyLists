import {Pressable} from "react-native";
import {colors} from "../../theme";
import {useState} from "react";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {BookmarkCheck, Info, Pencil, RefreshCw, UsersRound} from "lucide-react-native";
import {mediaLabels} from "../../lib/media";
import {CollapsingTabs} from "../../components/collapsing-tabs";
import {AppText, Page, QueryPanel} from "../../components/ui";
import {mediaOptions} from "../../lib/react-query/query-options/media.options";
import {useTrackingMutation, useMediaRefreshMutation} from "../../lib/react-query/query-mutations/media.mutations";
import type {MediaParams, UpdateInput} from "../../lib/api-client";
import type {ActivityCorrectionPreview} from "@/lib/types/activity.types";
import {MediaHero} from "./MediaHero";
import {MediaDetailsContent} from "./MediaDetailsContent";
import {MediaCommunityContent} from "./MediaCommunityContent";
import {MediaTrackingContent} from "./MediaTrackingContent";
import {MediaEditContent} from "./MediaEditContent";
import {MediaCorrectionSheet} from "./media-correction-sheet";
import {MediaCoverSheet} from "./media-cover-sheet";

type Correction = { payload: UpdateInput["payload"]; preview: ActivityCorrectionPreview; onSaved?: () => void };

export function MediaScreen() {
    const focused = useIsFocused();
    const params = useLocalSearchParams<{ mediaType: MediaParams["mediaType"]; mediaId: string }>();
    return <MediaContent key={`${params.mediaType}:${params.mediaId}`} media={{ mediaType: params.mediaType, mediaId: Number(params.mediaId) }} focused={focused}/>;
}

function MediaContent({ media, focused }: { media: MediaParams; focused: boolean }) {
    const [saved, setSaved] = useState(false);
    const [correction, setCorrection] = useState<Correction | null>(null);
    const [cover, setCover] = useState(false);
    const mutation = useTrackingMutation(media);
    const refresh = useMediaRefreshMutation(media);
    const query = useQuery({ ...mediaOptions(media), enabled: focused });
    const update = (payload: UpdateInput["payload"], activityCorrection?: UpdateInput["activityCorrection"], onSaved?: () => void) => {
        setSaved(false);
        mutation.mutate({ action: "update", input: { payload, activityCorrection } }, {
            onSuccess: result => {
                if (result.kind === "saved") {
                    setSaved(true);
                    setCorrection(null);
                    onSaved?.();
                }
                else setCorrection({ payload, preview: result.preview, onSaved });
            }
        });
    };
    return <Page title={mediaLabels[media.mediaType] ?? "Media"} brand back action={<Pressable accessibilityRole="button" accessibilityLabel="Refresh metadata"
                                                                                               accessibilityState={{
                                                                                                   disabled: !query.data?.refresh.allowed || refresh.isPending,
                                                                                                   busy: refresh.isPending
                                                                                               }} disabled={!query.data?.refresh.allowed || refresh.isPending}
                                                                                               onPress={() => refresh.mutate()} style={{
        width: 48,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
        opacity: query.data?.refresh.allowed ? 1 : 0.35
    }}><RefreshCw size={20} color={colors.muted}/></Pressable>}>
        {refresh.error && <AppText accessibilityRole="alert" style={{ padding: 12 }}>{refresh.error.message}</AppText>}
        {refresh.isSuccess && <AppText accessibilityRole="alert" style={{ padding: 12 }}>Metadata refreshed.</AppText>}
        <QueryPanel query={query}>{data => <>
            <CollapsingTabs initialTab="details" tabLayout="stacked" scrollable={data.canEdit} tabs={[
                { value: "details", label: "Overview", icon: Info }, { value: "tracking", label: "Your list", icon: BookmarkCheck }, {
                    value: "community",
                    label: "Community",
                    icon: UsersRound
                }, ...(data.canEdit ? [{ value: "edit", label: "Edit", icon: Pencil }] : []),
            ]} header={selectTab => <MediaHero data={data} mediaType={media.mediaType} pending={mutation.isPending} onTrack={() => selectTab("tracking")}
                                               onBookCover={() => setCover(true)}/>}
            >
                {tab => <>
                    {tab === "details" && <MediaDetailsContent params={media} data={data} refetch={query.refetch} refreshing={query.isRefetching}/>}
                    {tab === "community" && <MediaCommunityContent params={media}/>}
                    {tab === "tracking" &&
                        <MediaTrackingContent params={media} data={data} pending={mutation.isPending} correcting={!!correction} saved={saved} error={mutation.error?.message}
                                              update={(payload, onSaved) => update(payload, undefined, onSaved)} add={() => {
                            setSaved(false);
                            mutation.mutate({ action: "add" });
                        }} remove={onSaved => {
                            setSaved(false);
                            mutation.mutate({ action: "remove" }, {
                                onSuccess: () => {
                                    setSaved(true);
                                    onSaved();
                                }
                            });
                        }} refetch={query.refetch} refreshing={query.isRefetching}/>}
                    {tab === "edit" && data.canEdit && <MediaEditContent params={media}/>}
                </>}
            </CollapsingTabs>
            {cover && <MediaCoverSheet shared params={media} data={data} dismiss={() => setCover(false)}/>}
        </>}</QueryPanel>
        {correction &&
            <MediaCorrectionSheet key={correction.preview.version} preview={correction.preview} media={media} pending={mutation.isPending} error={mutation.error?.message}
                                  dismiss={() => setCorrection(null)} confirm={choice => update(correction.payload, choice, correction.onSaved)}/>}
    </Page>;
}
