import {useState} from "react";
import {colors} from "../../theme";
import {Alert, View} from "react-native";
import {useIsFocused} from "expo-router";
import {Heart} from "lucide-react-native";
import {mediaLabels} from "../../lib/media";
import {TrackingField} from "./TrackingField";
import {useQuery} from "@tanstack/react-query";
import {useLocalSearchParams} from "expo-router";
import {feelingOptions, scoreOptions} from "../../lib/ratings";
import {mediaOptions} from "../../lib/react-query/query-options/media.options";
import type {MediaParams, MobileMedia, UpdateInput} from "../../lib/api-client";
import {useTrackingMutation} from "../../lib/react-query/query-mutations/media.mutations";
import {AppText, Button, Content, Cover, Field, Page, QueryPanel, Section, Select, uiStyles} from "../../components/ui";


interface TvPositionProps {
    season: number;
    episode: number;
    pending: boolean;
    update: (payload: UpdateInput["payload"]) => void;
}


function TvPosition({ season: initialSeason, episode: initialEpisode, pending, update }: TvPositionProps) {
    const [season, setSeason] = useState(String(initialSeason));
    const [episode, setEpisode] = useState(String(initialEpisode));

    return (
        <View style={{ gap: 12 }}>
            <View style={uiStyles.row}>
                <View style={{ flex: 1 }}>
                    <Field
                        label="Season"
                        value={season}
                        editable={!pending}
                        onChangeText={setSeason}
                        keyboardType="number-pad"
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Field
                        label="Episode"
                        value={episode}
                        editable={!pending}
                        onChangeText={setEpisode}
                        keyboardType="number-pad"
                    />
                </View>
            </View>
            <Button
                secondary
                pending={pending}
                label="Save progress"
                onPress={() => update({ type: "tv", currentSeason: Number(season), currentEpisode: Number(episode) })}
                disabled={
                    !season.trim() ||
                    !episode.trim() ||
                    !Number.isInteger(Number(season)) ||
                    !Number.isInteger(Number(episode)) ||
                    Number(season) < 1 ||
                    Number(episode) < 0
                }
            />
        </View>
    );
}


interface SeasonTrackingProps {
    pending: boolean;
    ratingSystem: MobileMedia["ratingSystem"];
    seasons: NonNullable<MobileMedia["seasons"]>;
    update: (payload: UpdateInput["payload"]) => void;
}


function SeasonTracking({ seasons, pending, update, ratingSystem }: SeasonTrackingProps) {
    const [selected, setSelected] = useState(String(seasons[0]?.season ?? 1));
    const item = seasons.find((season) => String(season.season) === selected);

    return (
        <View style={{ gap: 16 }}>
            <Select
                label="Season"
                value={selected}
                onChange={setSelected}
                options={seasons.map((s) => ({ value: String(s.season), label: `Season ${s.season}` }))}
            />
            {item && (
                <>
                    <Select
                        disabled={pending}
                        label="Season rating"
                        value={item.rating == null ? "" : String(item.rating)}
                        options={[
                            { value: "", label: "Not rated" },
                            ...(ratingSystem === "score" ? scoreOptions : feelingOptions),
                        ]}
                        onChange={(value) =>
                            update({
                                type: "rating",
                                seasonRating: { season: item.season, rating: value === "" ? null : Number(value) },
                            })
                        }
                    />
                    <TrackingField
                        numeric={true}
                        pending={pending}
                        label="Season rewatches"
                        initial={String(item.redo)}
                        key={`redo:${item.season}:${item.redo}`}
                        onSave={(value) => update({ type: "redo", seasonRedos: [{ season: item.season, redo: Number(value) }] })}
                    />
                </>
            )}
        </View>
    );
}


interface TrackingEditorProps {
    pending: boolean;
    data: MobileMedia;
    update: (payload: UpdateInput["payload"]) => void;
}


function TrackingEditor({ data, update, pending }: TrackingEditorProps) {
    const tracking = data.tracking!;
    const minutesPerUnit = data.progress.timing.kind === "stored-minutes" ? data.progress.timing.minutesPerInputUnit : 1;

    return (
        <View style={uiStyles.padded}>
            <Select
                label="Status"
                disabled={pending}
                value={tracking.status}
                onChange={(status) => update({ type: "status", status })}
                options={data.statuses.map((value) => ({ value, label: value }))}
            />
            <Select
                disabled={pending}
                label="Your rating"
                value={tracking.rating == null ? "" : String(tracking.rating)}
                onChange={(val) => update({ type: "rating", rating: val === "" ? null : Number(val) })}
                options={[
                    { value: "", label: "Not rated" },
                    ...(data.ratingSystem === "feeling" ? feelingOptions : scoreOptions),
                ]}
            />
            <Button
                secondary={true}
                pending={pending}
                label={tracking.favorite ? "Remove from favorites" : "Add to favorites"}
                onPress={() => update({ type: "favorite", favorite: !tracking.favorite })}
            />
            {"currentSeason" in tracking &&
                <TvPosition
                    update={update}
                    pending={pending}
                    season={tracking.currentSeason}
                    episode={tracking.currentEpisode}
                    key={`${tracking.currentSeason}:${tracking.currentEpisode}`}
                />
            }
            {"actualPage" in tracking &&
                <TrackingField
                    numeric={true}
                    pending={pending}
                    label="Current page"
                    key={`page:${tracking.actualPage}`}
                    initial={String(tracking.actualPage)}
                    onSave={(value) => update({ type: "page", actualPage: Number(value) })}
                />
            }
            {"currentChapter" in tracking &&
                <TrackingField
                    numeric={true}
                    pending={pending}
                    label="Current chapter"
                    initial={String(tracking.currentChapter)}
                    key={`chapter:${tracking.currentChapter}`}
                    onSave={(value) => update({ type: "chapter", currentChapter: Number(value) })}
                />
            }
            {"playtime" in tracking &&
                <TrackingField
                    numeric={true}
                    pending={pending}
                    label={data.progress.unit.long}
                    key={`playtime:${tracking.playtime}`}
                    initial={String((tracking.playtime ?? 0) / minutesPerUnit)}
                    onSave={(value) => update({ type: "playtime", playtime: Number(value) * minutesPerUnit })}
                />
            }
            {"redo" in tracking && !data.seasons &&
                <TrackingField
                    numeric={true}
                    label="Repeats"
                    pending={pending}
                    key={`redo:${tracking.redo}`}
                    initial={String(tracking.redo)}
                    onSave={(value) => update({ type: "redo", redo: Number(value) })}
                />
            }
            {"platform" in tracking &&
                <Select
                    label="Platform"
                    disabled={pending}
                    value={tracking.platform ?? ""}
                    options={[
                        { value: "", label: "Not specified" },
                        ...data.compatiblePlatforms.map(({ name }) => ({ value: name, label: name })),
                    ]}
                    onChange={(value) =>
                        update({
                            type: "platform",
                            platform: value === "" ? null : (value as NonNullable<UpdateInput["payload"]["platform"]>),
                        })
                    }
                />
            }
            <TrackingField
                label="Notes"
                multiline={true}
                pending={pending}
                initial={tracking.comment ?? ""}
                key={`comment:${tracking.comment}`}
                onSave={(comment) => update({ type: "comment", comment })}
            />
            {data.seasons && data.seasons.length > 0 &&
                <SeasonTracking
                    update={update}
                    pending={pending}
                    seasons={data.seasons}
                    ratingSystem={data.ratingSystem}
                />
            }
        </View>
    );
}


export function MediaScreen() {
    const focused = useIsFocused();
    const [saved, setSaved] = useState(false);
    const params = useLocalSearchParams<{ mediaType: MediaParams["mediaType"]; mediaId: string }>();

    const media = { mediaType: params.mediaType, mediaId: Number(params.mediaId) };
    const mutation = useTrackingMutation(media);
    const query = useQuery({ ...mediaOptions(media), enabled: focused });

    const update = (payload: UpdateInput["payload"], activityCorrection?: UpdateInput["activityCorrection"]) => {
        setSaved(false);
        mutation.mutate({ action: "update", input: { payload, activityCorrection } }, {
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
        });
    };

    return (
        <Page title={mediaLabels[media.mediaType] ?? "Media"} back={true}>
            <QueryPanel query={query}>
                {(data) => (
                    <Content>
                        <View style={[uiStyles.row, { alignItems: "flex-start" }]}>
                            <Cover uri={data.media.cover} style={{ width: 108, height: 160 }}/>
                            <View style={{ flex: 1, gap: 10 }}>
                                <AppText heading>
                                    {data.media.name}
                                </AppText>
                                <AppText muted>
                                    {data.media.releaseDate?.slice(0, 4) ?? "Release date unknown"}
                                </AppText>
                                {data.tracking?.favorite &&
                                    <Heart
                                        size={20}
                                        fill={colors.favorite}
                                        color={colors.favorite}
                                    />
                                }
                            </View>
                        </View>
                        {data.media.synopsis &&
                            <AppText muted>
                                {data.media.synopsis}
                            </AppText>
                        }
                        {mutation.error &&
                            <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                                {mutation.error.message}
                            </AppText>
                        }
                        {saved &&
                            <AppText accessibilityRole="alert" style={{ color: colors.accent }}>
                                Changes saved.
                            </AppText>
                        }
                        {data.tracking ?
                            <>
                                <Section title="Your tracking">
                                    <TrackingEditor data={data} pending={mutation.isPending} update={update}/>
                                </Section>
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
                            :
                            data.active ?
                                <Button
                                    label="Add to your list"
                                    pending={mutation.isPending}
                                    onPress={() => mutation.mutate({ action: "add" })}
                                />
                                :
                                <AppText muted>
                                    Activate this media list in content settings before adding titles.
                                </AppText>
                        }
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}
