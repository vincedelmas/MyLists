import {getBooksContinueProgress, getGamesContinueProgress, getMangaContinueProgress, getTvContinueProgress} from "@/lib/utils/media/continue";
import {DateField} from "../../components/date-field";
import {formatDate, toDateInputValue} from "@/lib/utils/formatting/date";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
import {useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {ChevronRight, Heart, MessageSquare, Pencil, RotateCcw, Star} from "lucide-react-native";
import {AppText, Button, Field, Select} from "../../components/ui";
import {Rating} from "../../components/rating";
import {RatingInput} from "./RatingInput";
import {ActionSheet} from "../../components/action-sheet";
import {TrackingField} from "./TrackingField";
import type {MobileMedia, UpdateInput} from "../../lib/api-client";
import {colors, spacing, statusColors} from "../../theme";
import {formatMinutes} from "@/lib/utils/formatting/number";

type Update = (payload: UpdateInput["payload"], onSaved?: () => void) => void;

function ProgressEditor({ data, pending, update }: { data: MobileMedia; pending: boolean; update: Update }) {
    const tracking = data.tracking!;
    const minutesPerUnit =
        data.progress.timing.kind === "stored-minutes" ? data.progress.timing.minutesPerInputUnit : 1;
    const initialFirst = String(
        "currentSeason" in tracking
            ? tracking.currentSeason
            : "actualPage" in tracking
                ? (tracking.actualPage ?? 0)
                : "currentChapter" in tracking
                    ? tracking.currentChapter
                    : "playtime" in tracking
                        ? (tracking.playtime ?? 0) / minutesPerUnit
                        : "redo" in tracking
                            ? tracking.redo
                            : 0,
    );
    const [first, setFirst] = useState(initialFirst);
    const [second, setSecond] = useState(String("currentEpisode" in tracking ? tracking.currentEpisode : 0));
    const tv = "currentSeason" in tracking;
    const label = tv
        ? "Season"
        : "actualPage" in tracking
            ? "Page"
            : "currentChapter" in tracking
                ? "Chapter"
                : "playtime" in tracking
                    ? "Hours played"
                    : "Rewatches";
    const valid =
        first.trim() &&
        Number.isFinite(Number(first)) &&
        Number(first) >= (tv ? 1 : 0) &&
        ("playtime" in tracking || Number.isInteger(Number(first))) &&
        (!tv || (second.trim() && Number.isInteger(Number(second)) && Number(second) >= 0));
    return (
        <View style={styles.stack}>
            <Field
                label={label}
                value={first}
                onChangeText={(value) => setFirst(value.replace(",", "."))}
                keyboardType={"playtime" in tracking ? "decimal-pad" : "number-pad"}
                editable={!pending}
            />
            {tv && (
                <Field
                    label="Episode"
                    value={second}
                    onChangeText={setSecond}
                    keyboardType="number-pad"
                    editable={!pending}
                />
            )}
            <Button
                label="Save progress"
                pending={pending}
                disabled={
                    !valid ||
                    (first === initialFirst &&
                        second === String("currentEpisode" in tracking ? tracking.currentEpisode : 0))
                }
                onPress={() => {
                    const value = Number(first);
                    update(
                        tv
                            ? { type: "tv", currentSeason: value, currentEpisode: Number(second) }
                            : "actualPage" in tracking
                                ? { type: "page", actualPage: value }
                                : "currentChapter" in tracking
                                    ? { type: "chapter", currentChapter: value }
                                    : "playtime" in tracking
                                        ? { type: "playtime", playtime: Math.round(value * minutesPerUnit) }
                                        : { type: "redo", redo: value },
                    );
                }}
            />
        </View>
    );
}

export function TrackingEditor({
                                   data,
                                   update: saveUpdate,
                                   pending,
                                   error,
                                   correcting = false,
                               }: {
    data: MobileMedia;
    update: Update;
    pending: boolean;
    error?: string;
    correcting?: boolean;
}) {
    const tracking = data.tracking!;
    const [loggedAt, setLoggedAt] = useState("");
    const update: Update = (payload, onSaved) => saveUpdate({ ...payload, ...(["tv", "page", "chapter", "playtime", "redo", "status"].includes(payload.type) && loggedAt ? { loggedAt } : {}) }, onSaved);
    const [editor, setEditor] = useState<"progress" | "rating" | "notes" | "platform" | "season" | "repeats" | null>(
        null,
    );
    const [selectedSeason, setSelectedSeason] = useState(String(data.seasons?.[0]?.season ?? 1));
    const season = data.seasons?.find((item) => String(item.season) === selectedSeason);
    const close = () => setEditor(null);
    const save: Update = (payload) => update(payload, close);
    const tv = "currentSeason" in tracking;
    const movie = data.progress.unit.short === "views";
    const progress = movie
        ? tracking.status === "Completed"
            ? "Watched"
            : "Not watched"
        : tv
            ? `S${String(tracking.currentSeason).padStart(2, "0")}.E${String(tracking.currentEpisode).padStart(2, "0")}`
            : "actualPage" in tracking
                ? `${tracking.actualPage ?? 0}`
                : "currentChapter" in tracking
                    ? `${tracking.currentChapter}`
                    : "playtime" in tracking
                        ? tracking.playtime
                            ? formatMinutes(tracking.playtime, { compact: true })
                            : "0m"
                        : "redo" in tracking
                            ? `${tracking.redo}`
                            : "—";
    const unit = tv
        ? "Season · Episode"
        : "actualPage" in tracking
            ? "Pages read"
            : "currentChapter" in tracking
                ? "Chapters read"
                : "playtime" in tracking
                    ? "Time played"
                    : "Watch history";
    const progressInfo = tv && data.seasons?.some(season => season.season === tracking.currentSeason && season.episodes != null)
        ? getTvContinueProgress({ ...tracking, epsPerSeason: data.seasons.map(season => ({ season: season.season, episodes: season.episodes ?? 0 })) })
        : "actualPage" in tracking ? getBooksContinueProgress({ ...tracking, pages: data.media.totalProgress ?? 0 })
            : "currentChapter" in tracking ? getMangaContinueProgress({ ...tracking, chapters: data.media.totalProgress })
                : "playtime" in tracking ? getGamesContinueProgress(tracking) : null;
    const quick = movie ? tracking.status !== "Completed"
            ? { label: "Mark watched", payload: { type: "status", status: "Completed" } as const }
            : { label: "Log a rewatch", payload: { type: "redo", redo: "redo" in tracking ? tracking.redo + 1 : 1 } as const }
        : progressInfo?.update ? { label: progressInfo.actionLabel, payload: progressInfo.update.payload } : null;
    return (
        <View style={styles.content}>
            <View style={{ gap: 10 }}><DateField label={loggedAt ? "Log for · backlogging" : "Log for · today"} value={loggedAt || toDateInputValue(new Date())}
                                                 minimum={MIN_ACTIVITY_DATE} maximum={toDateInputValue(new Date())} disabled={pending}
                                                 onChange={value => setLoggedAt(value === toDateInputValue(new Date()) ? "" : value)}/>{loggedAt && <><AppText muted>Progress will
                be logged for {formatDate(loggedAt)}. Progress and monthly activity will use this date.</AppText><Button secondary label="Back to today" disabled={pending}
                                                                                                                         onPress={() => setLoggedAt("")}/></>}</View>
            <View style={styles.progress}>
                <AppText muted style={styles.eyebrow}>
                    {unit}
                </AppText>
                <AppText style={styles.progressValue}>{progress}</AppText>
                {movie && "redo" in tracking && (
                    <AppText muted>
                        {tracking.redo} {tracking.redo === 1 ? "rewatch" : "rewatches"}
                    </AppText>
                )}
                {progressInfo?.total != null && <AppText muted>{progressInfo.value} / {progressInfo.total} {data.progress.unit.plural}</AppText>}
                <View style={styles.progressActions}>
                    {quick && <Button label={quick.label} disabled={pending} onPress={() => update(quick.payload)}/>}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit progress"
                        disabled={pending}
                        onPress={() => setEditor("progress")}
                        style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
                    >
                        <Pencil size={16} color={colors.text}/>
                        <AppText>Edit</AppText>
                    </Pressable>
                </View>
            </View>
            <View style={styles.stack}>
                <AppText style={styles.heading}>Status</AppText>
                <View style={styles.statuses}>
                    {data.statuses.map((status) => (
                        <Pressable
                            key={status}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: status === tracking.status, disabled: pending }}
                            disabled={pending}
                            onPress={() => {
                                if (status !== tracking.status) update({ type: "status", status });
                            }}
                            style={({ pressed }) => [
                                styles.status,
                                status === tracking.status && styles.activeStatus,
                                pressed && styles.pressed,
                            ]}
                        >
                            <View style={[styles.dot, { backgroundColor: statusColors[status] ?? colors.muted }]}/>
                            <AppText style={[styles.statusText, status === tracking.status && styles.activeText]}>
                                {status}
                            </AppText>
                        </Pressable>
                    ))}
                </View>
            </View>
            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit your rating"
                    disabled={pending || !!loggedAt}
                    onPress={() => setEditor("rating")}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                >
                    <Star size={19} color={colors.rating}/>
                    <AppText muted style={styles.caption}>
                        Your rating
                    </AppText>
                    {tracking.rating === null ? (
                        <AppText>Rate this title</AppText>
                    ) : (
                        <Rating value={tracking.rating} system={data.ratingSystem}/>
                    )}
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tracking.favorite ? "Remove from favorites" : "Add to favorites"}
                    accessibilityState={{ selected: !!tracking.favorite, disabled: pending }}
                    disabled={pending || !!loggedAt}
                    onPress={() => update({ type: "favorite", favorite: !tracking.favorite })}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                >
                    <Heart
                        size={19}
                        color={tracking.favorite ? colors.favorite : colors.muted}
                        fill={tracking.favorite ? colors.favorite : "transparent"}
                    />
                    <AppText muted style={styles.caption}>
                        Favorite
                    </AppText>
                    <AppText>{tracking.favorite ? "Added to favorites" : "Add to favorites"}</AppText>
                </Pressable>
            </View>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit your comments"
                disabled={pending || !!loggedAt}
                onPress={() => setEditor("notes")}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
                <MessageSquare size={19} color={colors.muted}/>
                <View style={styles.rowText}>
                    <AppText style={styles.heading}>Your comments</AppText>
                    <AppText muted numberOfLines={3}>
                        {tracking.comment || "Add a thought about this title"}
                    </AppText>
                </View>
                <ChevronRight size={18} color={colors.muted}/>
            </Pressable>
            {"platform" in tracking && (
                <Pressable accessibilityRole="button" disabled={pending || !!loggedAt} onPress={() => setEditor("platform")} style={styles.row}>
                    <View style={styles.rowText}>
                        <AppText>Platform</AppText>
                        <AppText muted>{tracking.platform || "Choose a platform"}</AppText>
                    </View>
                    <ChevronRight size={18} color={colors.muted}/>
                </Pressable>
            )}
            {data.seasons?.length ? (
                <Pressable accessibilityRole="button" onPress={() => setEditor("season")} style={styles.row}>
                    <RotateCcw size={19} color={colors.muted}/>
                    <View style={styles.rowText}>
                        <AppText>Season ratings & rewatches</AppText>
                        <AppText muted>Manage each season</AppText>
                    </View>
                    <ChevronRight size={18} color={colors.muted}/>
                </Pressable>
            ) : "redo" in tracking && data.progress.unit.short !== "views" ? (
                <Pressable accessibilityRole="button" onPress={() => setEditor("repeats")} style={styles.row}>
                    <RotateCcw size={19} color={colors.muted}/>
                    <AppText style={styles.rowText}>Repeats · {tracking.redo}</AppText>
                    <ChevronRight size={18} color={colors.muted}/>
                </Pressable>
            ) : null}
            {editor && (
                <ActionSheet
                    title={
                        {
                            progress: "Edit progress",
                            rating: "Your rating",
                            notes: "Your comments",
                            platform: "Platform",
                            season: "Season tracking",
                            repeats: "Repeats",
                        }[editor]
                    }
                    suspended={correcting}
                    error={error}
                    dismiss={close}
                >
                    {editor === "progress" && <ProgressEditor data={data} pending={pending} update={save}/>}
                    {editor === "rating" && (
                        <RatingInput
                            key={String(tracking.rating)}
                            value={tracking.rating}
                            system={data.ratingSystem}
                            pending={pending}
                            onChange={(rating) => save({ type: "rating", rating })}
                        />
                    )}
                    {editor === "notes" && (
                        <TrackingField
                            label="Comments"
                            initial={tracking.comment ?? ""}
                            pending={pending}
                            multiline
                            onSave={(comment) => save({ type: "comment", comment })}
                        />
                    )}
                    {editor === "platform" && "platform" in tracking && (
                        <Select
                            label="Platform"
                            value={tracking.platform ?? ""}
                            disabled={pending}
                            options={[
                                { value: "", label: "Not specified" },
                                ...data.compatiblePlatforms.map(({ name }) => ({ value: name, label: name })),
                            ]}
                            onChange={(value) =>
                                save({
                                    type: "platform",
                                    platform: (value || null) as UpdateInput["payload"]["platform"],
                                })
                            }
                        />
                    )}
                    {editor === "repeats" && "redo" in tracking && (
                        <TrackingField
                            label="Repeats"
                            numeric
                            initial={String(tracking.redo)}
                            pending={pending}
                            onSave={(value) => save({ type: "redo", redo: Number(value) })}
                        />
                    )}
                    {editor === "season" && (
                        <View style={styles.stack}>
                            <Select
                                label="Season"
                                value={selectedSeason}
                                onChange={setSelectedSeason}
                                options={data.seasons!.map((item) => ({
                                    value: String(item.season),
                                    label: `Season ${item.season}`,
                                }))}
                            />
                            {season && (
                                <>
                                    <RatingInput
                                        key={`rating:${season.season}:${season.rating}`}
                                        label="Season rating"
                                        value={season.rating}
                                        system={data.ratingSystem}
                                        pending={pending || !!loggedAt}
                                        onChange={(rating) =>
                                            update({ type: "rating", seasonRating: { season: season.season, rating } })
                                        }
                                    />
                                    <TrackingField
                                        key={`redo:${season.season}:${season.redo}`}
                                        label="Rewatches"
                                        numeric
                                        initial={String(season.redo)}
                                        pending={pending}
                                        onSave={(value) =>
                                            update({
                                                type: "redo",
                                                seasonRedos: [{ season: season.season, redo: Number(value) }],
                                            })
                                        }
                                    />
                                </>
                            )}
                        </View>
                    )}
                </ActionSheet>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.xl },
    stack: { gap: spacing.md },
    progress: { padding: spacing.lg, gap: spacing.md, borderRadius: 16, backgroundColor: colors.surface },
    eyebrow: { fontSize: 12 },
    progressValue: { fontSize: 32, lineHeight: 40, fontWeight: "700", fontVariant: ["tabular-nums"] },
    progressActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
    edit: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md },
    heading: { fontWeight: "600", fontSize: 15 },
    statuses: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    status: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        flexBasis: "47%",
        flexGrow: 1,
        padding: spacing.md,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeStatus: { borderColor: colors.accent, backgroundColor: colors.primary },
    statusText: { fontSize: 12, flexShrink: 1 },
    activeText: { color: colors.accentText, fontWeight: "600" },
    dot: { width: 6, height: 6, borderRadius: 3 },
    actions: { flexDirection: "row", gap: spacing.md },
    action: { flex: 1, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 14 },
    caption: { fontSize: 11 },
    row: { flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: spacing.md, minHeight: 60 },
    rowText: { flex: 1, gap: spacing.xs },
    pressed: { opacity: 0.65 },
});
