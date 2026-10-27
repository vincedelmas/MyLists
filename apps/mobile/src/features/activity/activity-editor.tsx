import {useState} from "react";
import {Keyboard, Platform, Pressable, StyleSheet, View} from "react-native";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Switch} from "@expo/ui";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import {CalendarDays, Search, Trash2} from "lucide-react-native";
import {addMonthlyActivitySchema, monthlyActivityFieldsSchema} from "@/lib/schemas/activity.schema";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {getDefaultActivityDate, toActivityDisplayValue, toActivityStoredValue} from "@/lib/utils/media/activity";
import {dateInputValueToDate, formatDate, toDateInputValue} from "@/lib/utils/formatting/date";
import type {MediaType, MonthlyActivityMutation} from "../../lib/api-client";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {useActivityMutation} from "../../lib/react-query/query-mutations/activity.mutations";
import {activityMediaSearchOptions} from "../../lib/react-query/query-options/activity.options";
import {ActionSheet} from "../../components/action-sheet";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {NativeHost} from "../../components/native-host";
import {AppText, Button, Cover, Field, Select, StateView} from "../../components/ui";
import {mediaLabels, mediaColors} from "../../lib/media";
import {colors} from "../../theme";
import {parseActivityAmount, type ActivityPeriod, type ActivityRow} from "./activity-utils";

type SelectedMedia = { mediaId: number; mediaName: string; cover: string };

export function ActivityEditor({ activity, period, mediaTypes, dismiss }: { activity?: ActivityRow; period: ActivityPeriod; mediaTypes: MediaType[]; dismiss: () => void }) {
    const focused = useIsFocused();
    const mutation = useActivityMutation();
    const [mediaType, setMediaType] = useState<MediaType>(activity?.mediaType ?? mediaTypes[0]);
    const [selected, setSelected] = useState<SelectedMedia | null>(activity ? { mediaId: activity.mediaId, mediaName: activity.mediaName, cover: activity.mediaCover } : null);
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());
    const ready = search.trim().length >= 2 && term === search.trim();
    const media = useQuery({ ...activityMediaSearchOptions(mediaType, term), enabled: focused && !selected && ready });
    const [progress, setProgress] = useState(String(activity ? toActivityDisplayValue(activity.mediaType, activity.progressGained) : 1));
    const [redo, setRedo] = useState(String(activity?.redoGained ?? 0));
    const [completed, setCompleted] = useState(activity?.hadCompletion ?? false);
    const [hidden, setHidden] = useState(activity?.hidden ?? false);
    const [date, setDate] = useState(activity ? toDateInputValue(activity.lastActivityAt) : period.view === "month" ? getDefaultActivityDate(period.year, period.month) : "");
    const [dateOpen, setDateOpen] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState("");
    const today = toDateInputValue(new Date(), { timeZone: "utc" });
    const minimumDate = activity ? MIN_ACTIVITY_DATE : `${period.year}-01-01`;
    const maximumDate = !activity && period.year < Number(today.slice(0, 4)) ? `${period.year}-12-31` : today;
    const save = () => {
        if (!selected || mutation.isPending) return;
        setError("");
        const values = { progressGained: parseActivityAmount(progress), redoGained: parseActivityAmount(redo), hadCompletion: completed, hidden, lastActivityAt: date };
        const parsed = activity ? monthlyActivityFieldsSchema.safeParse(values) : addMonthlyActivitySchema.safeParse({ ...values, mediaId: selected.mediaId, mediaType });
        if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
        }
        if (!activity && Number(date.slice(0, 4)) !== period.year) {
            setError(`Choose an activity date in ${period.year}.`);
            return;
        }
        const payload = { ...values, progressGained: toActivityStoredValue(mediaType, values.progressGained), lastActivityAt: `${date}T12:00:00.000Z` };
        const input: MonthlyActivityMutation = activity ? { action: "update", activityId: activity.id, payload } : {
            action: "add",
            data: { ...payload, mediaId: selected.mediaId, mediaType }
        };
        Keyboard.dismiss();
        mutation.mutate(input, { onSuccess: dismiss });
    };
    if (removing && activity) return <ConfirmationSheet pending={mutation.isPending} error={mutation.error?.message} dismiss={() => setRemoving(false)} confirmation={{
        title: "Remove from month?",
        message: "This media's progress, completion, and re-experience contributions for this month will be permanently removed.",
        label: "Remove from month",
        cancelLabel: "Keep summary",
        icon: Trash2,
        closeOnConfirm: false,
        onConfirm: () => mutation.mutate({ action: "remove", activityId: activity.id }, { onSuccess: dismiss }),
    }}/>;

    return <ActionSheet title={activity ? "Edit monthly activity" : "Add activity"} dismiss={dismiss} error={error || mutation.error?.message}>
        <View style={styles.form}>
            {!selected ? <>
                <Select label="Media type" value={mediaType} options={mediaTypes.map(value => ({ value, label: mediaLabels[value] }))} onChange={value => {
                    setMediaType(value);
                    setSearch("");
                }}/>
                <Field label="Find media in your list" leadingIcon={<Search size={18} color={colors.muted}/>} clearable value={search} onChangeText={setSearch}
                       placeholder={`Search your ${mediaLabels[mediaType].toLowerCase()}…`} autoCorrect={false}/>
                {search.trim().length >= 2 && (!ready || media.isPending || media.isFetching) ? <StateView loading/> : ready && media.error ?
                    <StateView title="Couldn’t search your list" message={media.error.message} retry={() => void media.refetch()}/> : ready && media.data?.length === 0 ?
                        <AppText muted style={styles.caption}>No matching media found in your list.</AppText> : null}
                {ready && !media.isFetching && media.data &&
                    <View>{media.data.map(item => <Pressable key={item.mediaId} accessibilityRole="button" accessibilityLabel={`Select ${item.mediaName}`} onPress={() => {
                        setSelected(item);
                        Keyboard.dismiss();
                    }} style={({ pressed }) => [styles.searchResult, pressed && styles.pressed]}>
                        <Cover uri={item.cover} label={item.mediaName} style={styles.smallCover}/><AppText style={styles.resultName}>{item.mediaName}</AppText>
                    </Pressable>)}</View>}
            </> : <>
                <View style={styles.selected}><Cover uri={selected.cover} label={selected.mediaName} style={styles.smallCover}/><View style={styles.identity}>
                    <AppText style={[styles.type, { color: mediaColors[mediaType] }]}>{mediaLabels[mediaType]}</AppText><AppText numberOfLines={2}
                                                                                                                                 style={styles.name}>{selected.mediaName}</AppText>
                </View>{!activity && <Button secondary label="Change" disabled={mutation.isPending} onPress={() => setSelected(null)}/>}</View>
                <Field label={getMediaDefinition(mediaType).progress.unit.long} value={progress} onChangeText={setProgress} keyboardType="decimal-pad"
                       editable={!mutation.isPending}/>
                <Field label="Re-experiences gained" value={redo} onChangeText={setRedo} keyboardType="number-pad" editable={!mutation.isPending}/>
                <View style={styles.dateField}><AppText muted style={styles.caption}>Activity date</AppText><Pressable accessibilityRole="button"
                                                                                                                       accessibilityLabel="Choose activity date"
                                                                                                                       disabled={mutation.isPending} onPress={() => {
                    Keyboard.dismiss();
                    setDateOpen(true);
                }} style={styles.dateButton}><CalendarDays size={18} color={colors.accent}/><AppText>{date ? formatDate(date) : "Choose a date"}</AppText></Pressable>
                    {activity && <AppText muted style={styles.caption}>Changing the month moves this summary and merges it with an existing one.</AppText>}
                </View>
                {dateOpen && <>
                    <DateTimePicker value={dateInputValueToDate(date || getDefaultActivityDate(period.year, period.month))} mode="date"
                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                    minimumDate={dateInputValueToDate(minimumDate)} maximumDate={dateInputValueToDate(maximumDate)} themeVariant="dark" accentColor={colors.accent}
                                    onDismiss={() => setDateOpen(false)}
                                    onValueChange={(_event, selectedDate) => {
                                        setDate(toDateInputValue(selectedDate, { timeZone: "local" }));
                                        if (Platform.OS !== "ios") setDateOpen(false);
                                    }}/>
                    {Platform.OS === "ios" && <Button fullWidth secondary label="Done" onPress={() => setDateOpen(false)}/>}
                </>}
                <NativeHost><Switch label="Completed this month" value={completed} onValueChange={setCompleted} disabled={mutation.isPending}/></NativeHost>
                {activity &&
                    <View style={styles.hidden}><NativeHost><Switch label="Hidden" value={hidden} onValueChange={setHidden} disabled={mutation.isPending}/></NativeHost><AppText
                        muted style={styles.caption}>Keep this summary editable, but hide it from public activity and yearly recap.</AppText></View>}
                <Button fullWidth label={activity ? "Save monthly activity" : "Add monthly activity"} pending={mutation.isPending} onPress={save}/>
                {activity && <Button fullWidth secondary danger label="Remove from month" disabled={mutation.isPending} onPress={() => {
                    mutation.reset();
                    setError("");
                    setRemoving(true);
                }}/>}
            </>}
        </View>
    </ActionSheet>;
}

const styles = StyleSheet.create({
    form: { gap: 16 },
    caption: { fontSize: 12, lineHeight: 18 },
    selected: { flexDirection: "row", alignItems: "center", gap: 12 },
    smallCover: { width: 42, height: 63, borderRadius: 7 },
    identity: { flex: 1, minWidth: 0, gap: 5 },
    type: { fontSize: 11, lineHeight: 16, fontWeight: "500" },
    name: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
    searchResult: {
        minHeight: 76,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },
    resultName: { flex: 1, fontSize: 14, lineHeight: 20 },
    dateField: { gap: 8 },
    dateButton: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border },
    hidden: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.background },
    pressed: { opacity: 0.6 },
});
