import {Pressable, StyleSheet, View} from "react-native";
import {ChevronRight} from "lucide-react-native";
import {formatDate, formatMonthYear} from "@/lib/utils/formatting/date";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {ActionSheet} from "../../components/action-sheet";
import {AppText} from "../../components/ui";
import {colors} from "../../theme";
import {ActivitySignals} from "./activity-card";
import {formatActivityProgress, type ActivityRow} from "./activity-utils";

export function ActivityOccurrences({ row, dismiss, onMonth }: { row: ActivityRow; dismiss: () => void; onMonth: (month: string) => void }) {
    return <ActionSheet title={row.mediaName} dismiss={dismiss}>
        <View style={styles.stack}><AppText muted style={styles.caption}>Select a month to see its
            summary{row.occurrences!.length > 1 ? ` · ${row.occurrences!.length} recorded months` : ""}.</AppText>
            {row.occurrences!.map(month => <Pressable key={month.id} accessibilityRole="button"
                                                      accessibilityLabel={`Open ${formatMonthYear(month.monthBucket)} activity for ${row.mediaName}`}
                                                      onPress={() => onMonth(month.monthBucket)} style={({ pressed }) => [styles.month, pressed && styles.pressed]}>
                <View style={styles.details}><AppText style={styles.title}>{formatMonthYear(month.monthBucket, { month: "long" })}</AppText>
                    <AppText muted style={styles.caption}>{formatActivityProgress({
                        ...row,
                        progressGained: month.progressGained
                    })} · {formatMinutes(month.timeGained, { compact: true })}</AppText>
                    <ActivitySignals row={month} view="month"/><AppText muted style={styles.date}>{formatDate(month.lastActivityAt)}</AppText>
                </View><ChevronRight size={18} color={colors.accent}/>
            </Pressable>)}
        </View>
    </ActionSheet>;
}

const styles = StyleSheet.create({
    stack: { gap: 12 },
    caption: { fontSize: 12, lineHeight: 18 },
    month: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
    details: { flex: 1, minWidth: 0, gap: 6 },
    title: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
    date: { fontSize: 11, lineHeight: 16 },
    pressed: { opacity: 0.6 },
});
