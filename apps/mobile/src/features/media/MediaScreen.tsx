import {useIsFocused} from "expo-router";
import {useState} from "react";
import {Alert, View} from "react-native";
import {useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Heart} from "lucide-react-native";
import {AppText, Button, Content, Cover, Field, Page, QueryPanel, Section, Select, uiStyles} from "../../components/ui";
import {mediaOptions} from "../../lib/react-query/query-options/media.options";
import {useTrackingMutation} from "../../lib/react-query/query-mutations/media.mutations";
import type {MediaParams, MobileMedia, UpdateInput} from "../../lib/api-client";
import {mediaLabels} from "../../lib/media";
import {colors} from "../../theme";
import {feelingOptions, scoreOptions} from "../../lib/ratings";
import {TrackingField} from "./TrackingField";

function TvPosition({
    season: initialSeason,
    episode: initialEpisode,
    pending,
    update,
}: {
    season: number;
    episode: number;
    pending: boolean;
    update: (payload: UpdateInput["payload"]) => void;
}) {
    const [season, setSeason] = useState(String(initialSeason));
    const [episode, setEpisode] = useState(String(initialEpisode));
    return (
        <View style={{gap: 12}}>
            <View style={uiStyles.row}>
                <View style={{flex: 1}}>
                    <Field
                        label="Season"
                        value={season}
                        onChangeText={setSeason}
                        keyboardType="number-pad"
                        editable={!pending}
                    />
                </View>
                <View style={{flex: 1}}>
                    <Field
                        label="Episode"
                        value={episode}
                        onChangeText={setEpisode}
                        keyboardType="number-pad"
                        editable={!pending}
                    />
                </View>
            </View>
            <Button
                secondary
                label="Save progress"
                pending={pending}
                disabled={
                    !season.trim() ||
                    !episode.trim() ||
                    !Number.isInteger(Number(season)) ||
                    !Number.isInteger(Number(episode)) ||
                    Number(season) < 1 ||
                    Number(episode) < 0
                }
                onPress={() => update({type: "tv", currentSeason: Number(season), currentEpisode: Number(episode)})}
            />
        </View>
    );
}

function SeasonTracking({
    seasons,
    pending,
    update,
    ratingSystem,
}: {
    seasons: NonNullable<MobileMedia["seasons"]>;
    ratingSystem: MobileMedia["ratingSystem"];
    pending: boolean;
    update: (payload: UpdateInput["payload"]) => void;
}) {
    const [selected, setSelected] = useState(String(seasons[0]?.season ?? 1));
    const item = seasons.find((season) => String(season.season) === selected);
    return (
        <View style={{gap: 16}}>
            <Select
                label="Season"
                value={selected}
                onChange={setSelected}
                options={seasons.map((season) => ({value: String(season.season), label: `Season ${season.season}`}))}
            />
            {item && (
                <>
                    <Select
                        label="Season rating"
                        value={item.rating == null ? "" : String(item.rating)}
                        disabled={pending}
                        options={[
                            {value: "", label: "Not rated"},
                            ...(ratingSystem === "score" ? scoreOptions : feelingOptions),
                        ]}
                        onChange={(value) =>
                            update({
                                type: "rating",
                                seasonRating: {season: item.season, rating: value === "" ? null : Number(value)},
                            })
                        }
                    />
                    <TrackingField
                        key={`redo:${item.season}:${item.redo}`}
                        label="Season rewatches"
                        initial={String(item.redo)}
                        pending={pending}
                        numeric
                        onSave={(value) =>
                            update({type: "redo", seasonRedos: [{season: item.season, redo: Number(value)}]})
                        }
                    />
                </>
            )}
        </View>
    );
}

function TrackingEditor({
    data,
    update,
    pending,
}: {
    data: MobileMedia;
    update: (payload: UpdateInput["payload"]) => void;
    pending: boolean;
}) {
    const tracking = data.tracking!;
    const minutesPerUnit =
        data.progress.timing.kind === "stored-minutes" ? data.progress.timing.minutesPerInputUnit : 1;
    return (
        <View style={uiStyles.padded}>
            <Select
                label="Status"
                value={tracking.status}
                disabled={pending}
                options={data.statuses.map((value) => ({value, label: value}))}
                onChange={(status) => update({type: "status", status})}
            />
            <Select
                label="Your rating"
                value={tracking.rating == null ? "" : String(tracking.rating)}
                disabled={pending}
                options={[
                    {value: "", label: "Not rated"},
                    ...(data.ratingSystem === "feeling" ? feelingOptions : scoreOptions),
                ]}
                onChange={(value) => update({type: "rating", rating: value === "" ? null : Number(value)})}
            />
            <Button
                label={tracking.favorite ? "Remove from favorites" : "Add to favorites"}
                secondary
                pending={pending}
                onPress={() => update({type: "favorite", favorite: !tracking.favorite})}
            />
            {"currentSeason" in tracking && (
                <TvPosition
                    key={`${tracking.currentSeason}:${tracking.currentEpisode}`}
                    season={tracking.currentSeason}
                    episode={tracking.currentEpisode}
                    pending={pending}
                    update={update}
                />
            )}
            {"actualPage" in tracking && (
                <TrackingField
                    key={`page:${tracking.actualPage}`}
                    label="Current page"
                    initial={String(tracking.actualPage)}
                    pending={pending}
                    numeric
                    onSave={(value) => update({type: "page", actualPage: Number(value)})}
                />
            )}
            {"currentChapter" in tracking && (
                <TrackingField
                    key={`chapter:${tracking.currentChapter}`}
                    label="Current chapter"
                    initial={String(tracking.currentChapter)}
                    pending={pending}
                    numeric
                    onSave={(value) => update({type: "chapter", currentChapter: Number(value)})}
                />
            )}
            {"playtime" in tracking && (
                <TrackingField
                    key={`playtime:${tracking.playtime}`}
                    label={data.progress.unit.long}
                    initial={String((tracking.playtime ?? 0) / minutesPerUnit)}
                    pending={pending}
                    numeric
                    onSave={(value) => update({type: "playtime", playtime: Number(value) * minutesPerUnit})}
                />
            )}
            {"redo" in tracking && !data.seasons && (
                <TrackingField
                    key={`redo:${tracking.redo}`}
                    label="Repeats"
                    initial={String(tracking.redo)}
                    pending={pending}
                    numeric
                    onSave={(value) => update({type: "redo", redo: Number(value)})}
                />
            )}
            {"platform" in tracking && (
                <Select
                    label="Platform"
                    value={tracking.platform ?? ""}
                    options={[
                        {value: "", label: "Not specified"},
                        ...data.compatiblePlatforms.map(({name}) => ({value: name, label: name})),
                    ]}
                    disabled={pending}
                    onChange={(value) =>
                        update({
                            type: "platform",
                            platform: value === "" ? null : (value as NonNullable<UpdateInput["payload"]["platform"]>),
                        })
                    }
                />
            )}
            <TrackingField
                key={`comment:${tracking.comment}`}
                label="Notes"
                initial={tracking.comment ?? ""}
                pending={pending}
                multiline
                onSave={(comment) => update({type: "comment", comment})}
            />
            {data.seasons && data.seasons.length > 0 && (
                <SeasonTracking
                    ratingSystem={data.ratingSystem}
                    seasons={data.seasons}
                    pending={pending}
                    update={update}
                />
            )}
        </View>
    );
}

export function MediaScreen() {
    const params = useLocalSearchParams<{mediaType: MediaParams["mediaType"]; mediaId: string}>();
    const media = {mediaType: params.mediaType, mediaId: Number(params.mediaId)};
    const focused = useIsFocused();
    const query = useQuery({...mediaOptions(media), enabled: focused});
    const mutation = useTrackingMutation(media);
    const [saved, setSaved] = useState(false);
    const update = (payload: UpdateInput["payload"], activityCorrection?: UpdateInput["activityCorrection"]) => {
        setSaved(false);
        mutation.mutate(
            {action: "update", input: {payload, activityCorrection}},
            {
                onSuccess: (result) => {
                    if (result.kind === "saved") {
                        setSaved(true);
                        return;
                    }
                    const preview = result.preview;
                    Alert.alert(
                        "Review activity correction",
                        `Reducing progress can change your monthly history. ${preview.months.length} recorded month(s) are available for correction. Keep the history, or adjust it from the most recent month backwards?`,
                        [
                            {text: "Cancel", style: "cancel"},
                            {
                                text: "Keep history",
                                onPress: () => update(payload, {version: preview.version, keepHistory: true}),
                            },
                            {
                                text: "Adjust history",
                                style: "destructive",
                                onPress: () => update(payload, {version: preview.version}),
                            },
                        ],
                    );
                },
            },
        );
    };
    return (
        <Page title={mediaLabels[media.mediaType] ?? "Media"} back>
            <QueryPanel query={query}>
                {(data) => (
                    <Content>
                        <View style={[uiStyles.row, {alignItems: "flex-start"}]}>
                            <Cover uri={data.media.cover} style={{width: 108, height: 160}} />
                            <View style={{flex: 1, gap: 10}}>
                                <AppText heading>{data.media.name}</AppText>
                                <AppText muted>{data.media.releaseDate?.slice(0, 4) ?? "Release date unknown"}</AppText>
                                {data.tracking?.favorite && (
                                    <Heart size={20} color={colors.favorite} fill={colors.favorite} />
                                )}
                            </View>
                        </View>
                        {data.media.synopsis && <AppText muted>{data.media.synopsis}</AppText>}
                        {mutation.error && (
                            <AppText accessibilityRole="alert" style={{color: colors.error}}>
                                {mutation.error.message}
                            </AppText>
                        )}
                        {saved && (
                            <AppText accessibilityRole="alert" style={{color: colors.accent}}>
                                Changes saved.
                            </AppText>
                        )}
                        {data.tracking ? (
                            <>
                                <Section title="Your tracking">
                                    <TrackingEditor data={data} pending={mutation.isPending} update={update} />
                                </Section>
                                <Button
                                    danger
                                    label="Remove from your list"
                                    pending={mutation.isPending}
                                    onPress={() =>
                                        Alert.alert(
                                            "Remove from your list?",
                                            "Your rating, notes, progress, and tracking history for this title will be removed.",
                                            [
                                                {text: "Cancel", style: "cancel"},
                                                {
                                                    text: "Remove",
                                                    style: "destructive",
                                                    onPress: () => {
                                                        setSaved(false);
                                                        mutation.mutate({action: "remove"});
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
                                onPress={() => mutation.mutate({action: "add"})}
                            />
                        ) : (
                            <AppText muted>Activate this media list in content settings before adding titles.</AppText>
                        )}
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}
