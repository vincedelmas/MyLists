import {FlatList, Pressable, StyleSheet, View} from "react-native";
import {Clock3} from "lucide-react-native";
import type {api, MediaType} from "../../lib/api-client";
import {AppText, Card} from "../../components/ui";
import {mediaColors, mediaIcons, mediaLabels} from "../../lib/media";
import {getMonthlyActivityStatSummary} from "@/lib/utils/media/activity";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {colors} from "../../theme";

export function ActivitySummary({ data, selected, onSelect }: {
    data: Awaited<ReturnType<typeof api.monthlyActivityStats>>;
    selected: MediaType | "all";
    onSelect: (type: MediaType) => void
}) {
    return <Card style={styles.card}>
        <View style={styles.total}><View style={styles.totalHeading}><Clock3 size={18} color={colors.accent}/><AppText muted style={styles.caption}>Total time · all visible
            media</AppText></View>
            <AppText style={styles.time}>{data.totalTime > 0 ? formatMinutes(data.totalTime, { compact: true }) : "0m"}</AppText>
            {data.totalTime > 0 && <View style={styles.bar}>{data.mediaStats.map(item => item.timeGained > 0 &&
                <View key={item.mediaType} style={{ width: `${item.timeGained / data.totalTime * 100}%`, backgroundColor: mediaColors[item.mediaType] }}/>)}</View>}
        </View>
        {data.mediaStats.length ? <FlatList horizontal showsHorizontalScrollIndicator={false} style={styles.metrics} data={data.mediaStats} keyExtractor={item => item.mediaType}
                                            initialNumToRender={3} windowSize={5} renderItem={({ item }) => {
            const Icon = mediaIcons[item.mediaType];
            const color = mediaColors[item.mediaType];
            return <Pressable key={item.mediaType} accessibilityRole="button"
                              accessibilityLabel={`Filter ${mediaLabels[item.mediaType]} activity, ${formatMinutes(item.timeGained)}`}
                              accessibilityState={{ selected: selected === item.mediaType }}
                              onPress={() => onSelect(item.mediaType)}
                              style={({ pressed }) => [styles.metric, selected === item.mediaType && { backgroundColor: `${color}12` }, pressed && styles.pressed]}>
                <View style={styles.labelRow}><Icon size={14} color={color}/><AppText style={[styles.label, { color }]}>{mediaLabels[item.mediaType]}</AppText></View>
                <AppText style={styles.value}>{item.timeGained > 0 ? formatMinutes(item.timeGained, { compact: true }) : "0m"}</AppText>
                <AppText muted style={styles.note}>{getMonthlyActivityStatSummary(item.mediaType, item.progressTotal, item.count)}</AppText>
            </Pressable>;
        }}/> : <AppText muted style={styles.empty}>No visible time recorded in this period.</AppText>}
    </Card>;
}

const styles = StyleSheet.create({
    card: { borderRadius: 16 },
    total: { padding: 16, gap: 10 },
    totalHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
    caption: { fontSize: 12, lineHeight: 18 },
    time: { fontSize: 30, lineHeight: 38, fontWeight: "700", fontVariant: ["tabular-nums"] },
    bar: { height: 5, borderRadius: 3, overflow: "hidden", flexDirection: "row" },
    metrics: { flexGrow: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    metric: { width: 128, padding: 12, gap: 5 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    label: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
    value: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontVariant: ["tabular-nums"] },
    note: { fontSize: 10, lineHeight: 16 },
    empty: { paddingHorizontal: 16, paddingBottom: 16, fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.6 },
});
