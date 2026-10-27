import {useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {Switch} from "@expo/ui";
import {ChevronLeft, ChevronRight} from "lucide-react-native";
import {formatMonth} from "@/lib/utils/formatting/date";
import {AppText, Button, Field, Select} from "../../components/ui";
import {ActionSheet} from "../../components/action-sheet";
import {NativeHost} from "../../components/native-host";
import {colors} from "../../theme";
import type {MonthlyActivityInput} from "../../lib/api-client";
import {activityKinds, type ActivityPeriod} from "./activity-utils";

export function ActivityPeriodSheet({ period, onSelect, dismiss }: { period: ActivityPeriod; onSelect: (period: ActivityPeriod) => void; dismiss: () => void }) {
    const [year, setYear] = useState(String(period.year));
    const now = new Date();
    const valid = /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= now.getFullYear();
    return <ActionSheet title="Choose a period" dismiss={dismiss}>
        <View style={styles.stack}>
            <View style={styles.yearRow}>
                <Pressable accessibilityRole="button" accessibilityLabel="Previous year" disabled={!valid || Number(year) === 1900}
                           onPress={() => setYear(String(Number(year) - 1))} style={styles.arrow}><ChevronLeft size={21} color={colors.muted}/></Pressable>
                <View style={styles.yearField}><Field label="Year" hideLabel value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4}/></View>
                <Pressable accessibilityRole="button" accessibilityLabel="Next year" disabled={!valid || Number(year) === now.getFullYear()}
                           onPress={() => setYear(String(Number(year) + 1))} style={styles.arrow}><ChevronRight size={21} color={colors.muted}/></Pressable>
            </View>
            {!valid && <AppText accessibilityRole="alert" style={styles.error}>Choose a year between 1900 and {now.getFullYear()}.</AppText>}
            <Button fullWidth label={`View all of ${valid ? year : "this year"}`} disabled={!valid}
                    onPress={() => onSelect({ year: Number(year), month: Math.min(period.month, now.getMonth() + 1), view: "year" })}/>
            <View style={styles.months}>{Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const disabled = !valid || Number(year) === now.getFullYear() && month > now.getMonth() + 1;
                const selected = period.view === "month" && period.year === Number(year) && period.month === month;
                return <Pressable key={month} accessibilityRole="button" accessibilityLabel={`${formatMonth(month)} ${year}`} accessibilityState={{ disabled, selected }}
                                  disabled={disabled}
                                  onPress={() => onSelect({ year: Number(year), month, view: "month" })}
                                  style={({ pressed }) => [styles.month, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
                    <AppText style={[styles.monthLabel, selected && { color: colors.accent }]}>{formatMonth(month, { month: "short" })}</AppText>
                </Pressable>;
            })}</View>
            <Button fullWidth secondary label="Current month" onPress={() => onSelect({ year: now.getFullYear(), month: now.getMonth() + 1, view: "month" })}/>
        </View>
    </ActionSheet>;
}

export function ActivityFilterSheet({ filters, canEdit, onChange, dismiss }: {
    filters: Pick<MonthlyActivityInput, "activityKind" | "hiddenOnly">;
    canEdit: boolean;
    onChange: (filters: Pick<MonthlyActivityInput, "activityKind" | "hiddenOnly">) => void;
    dismiss: () => void;
}) {
    const [kind, setKind] = useState(filters.activityKind);
    const [hidden, setHidden] = useState(filters.hiddenOnly);
    return <ActionSheet title="Filter activity" dismiss={dismiss}>
        <View style={styles.stack}>
            <Select label="Activity kind" value={kind} options={activityKinds} onChange={setKind}/>
            {canEdit && <View style={styles.visibility}>
                <NativeHost><Switch label="Hidden only" value={hidden} onValueChange={setHidden}/></NativeHost>
                <AppText muted style={styles.caption}>Hidden summaries stay editable and are excluded from public activity and yearly recaps.</AppText>
            </View>}
            <Button fullWidth label="Apply filters" onPress={() => {
                onChange({ activityKind: kind, hiddenOnly: canEdit && hidden });
                dismiss();
            }}/>
            <Button fullWidth secondary label="Reset filters" onPress={() => {
                onChange({ activityKind: "all", hiddenOnly: false });
                dismiss();
            }}/>
        </View>
    </ActionSheet>;
}

const styles = StyleSheet.create({
    stack: { gap: 16 },
    yearRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    yearField: { flex: 1 },
    arrow: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
    months: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    month: { flexBasis: "30%", flexGrow: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    selected: { borderColor: colors.primary, backgroundColor: `${colors.accent}12` },
    monthLabel: { fontSize: 13, fontWeight: "600" },
    visibility: { padding: 12, borderRadius: 14, backgroundColor: colors.background, gap: 8 },
    caption: { fontSize: 12, lineHeight: 18 },
    error: { color: colors.error, fontSize: 12, lineHeight: 18 },
    disabled: { opacity: 0.25 },
    pressed: { opacity: 0.6 },
});
