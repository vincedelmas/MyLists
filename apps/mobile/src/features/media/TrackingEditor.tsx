import { useState } from "react";
import { View } from "react-native";
import { Collapsible, RNHostView, Row, Switch, Text as NativeText } from "@expo/ui";
import { NativeHost } from "../../components/native-host";
import { TrackingField } from "./TrackingField";
import { feelingOptions, scoreOptions } from "../../lib/ratings";
import type { MobileMedia, UpdateInput } from "../../lib/api-client";
import { Button, Field, Section, Select, uiStyles } from "../../components/ui";

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
                    (season === String(initialSeason) && episode === String(initialEpisode)) ||
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
                        onSave={(value) =>
                            update({ type: "redo", seasonRedos: [{ season: item.season, redo: Number(value) }] })
                        }
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

export function TrackingEditor({ data, update, pending }: TrackingEditorProps) {
    const [seasonsOpen, setSeasonsOpen] = useState(false);
    const tracking = data.tracking!;
    const minutesPerUnit =
        data.progress.timing.kind === "stored-minutes" ? data.progress.timing.minutesPerInputUnit : 1;

    return (
        <View style={{ gap: 20 }}>
            <Section title="In your list">
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
                    <NativeHost>
                        <Row spacing={12}>
                            <NativeText>Favorite</NativeText>
                            <Switch
                                value={Boolean(tracking.favorite)}
                                disabled={pending}
                                onValueChange={(favorite) => update({ type: "favorite", favorite })}
                            />
                        </Row>
                    </NativeHost>
                </View>
            </Section>
            <Section title="Progress">
                <View style={uiStyles.padded}>
                    {"currentSeason" in tracking && (
                        <TvPosition
                            update={update}
                            pending={pending}
                            season={tracking.currentSeason}
                            episode={tracking.currentEpisode}
                            key={`${tracking.currentSeason}:${tracking.currentEpisode}`}
                        />
                    )}
                    {"actualPage" in tracking && (
                        <TrackingField
                            numeric={true}
                            pending={pending}
                            label="Current page"
                            key={`page:${tracking.actualPage}`}
                            initial={String(tracking.actualPage ?? 0)}
                            onSave={(value) => update({ type: "page", actualPage: Number(value) })}
                        />
                    )}
                    {"currentChapter" in tracking && (
                        <TrackingField
                            numeric={true}
                            pending={pending}
                            label="Current chapter"
                            initial={String(tracking.currentChapter)}
                            key={`chapter:${tracking.currentChapter}`}
                            onSave={(value) => update({ type: "chapter", currentChapter: Number(value) })}
                        />
                    )}
                    {"playtime" in tracking && (
                        <TrackingField
                            numeric={true}
                            pending={pending}
                            allowDecimals
                            label={data.progress.unit.long}
                            key={`playtime:${tracking.playtime}`}
                            initial={String((tracking.playtime ?? 0) / minutesPerUnit)}
                            onSave={(value) => update({ type: "playtime", playtime: Number(value) * minutesPerUnit })}
                        />
                    )}
                    {"redo" in tracking && !data.seasons && (
                        <TrackingField
                            numeric={true}
                            label="Repeats"
                            pending={pending}
                            key={`redo:${tracking.redo}`}
                            initial={String(tracking.redo)}
                            onSave={(value) => update({ type: "redo", redo: Number(value) })}
                        />
                    )}
                    {"platform" in tracking && (
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
                                    platform:
                                        value === ""
                                            ? null
                                            : (value as NonNullable<UpdateInput["payload"]["platform"]>),
                                })
                            }
                        />
                    )}
                </View>
            </Section>
            <Section title="Your notes">
                <View style={uiStyles.padded}>
                    <TrackingField
                        label="Notes"
                        multiline={true}
                        pending={pending}
                        initial={tracking.comment ?? ""}
                        key={`comment:${tracking.comment}`}
                        onSave={(comment) => update({ type: "comment", comment })}
                    />
                </View>
            </Section>
            {data.seasons && data.seasons.length > 0 && (
                <NativeHost>
                    <Collapsible label="Season ratings & rewatches" isOpen={seasonsOpen} onOpenChange={setSeasonsOpen}>
                        <RNHostView matchContents={{ vertical: true }}>
                            <View>
                                <SeasonTracking
                                    update={update}
                                    pending={pending}
                                    seasons={data.seasons}
                                    ratingSystem={data.ratingSystem}
                                />
                            </View>
                        </RNHostView>
                    </Collapsible>
                </NativeHost>
            )}
        </View>
    );
}
