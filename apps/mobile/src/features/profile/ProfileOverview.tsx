import {StyleSheet, View} from "react-native";
import {Clock, LibraryBig, Star, ChartNoAxesColumn} from "lucide-react-native";
import type {MobileProfile} from "../../lib/api-client";
import {AppText, Card} from "../../components/ui";
import {FeelingIcon} from "../../components/feeling-icon";
import {colors} from "../../theme";
import {mediaColors, mediaLabels, compareMediaTypes} from "../../lib/media";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";

export function ProfileOverview({ data }: { data: MobileProfile }) {
    const { summary, lists, user } = data;
    const totalHours = lists.reduce((total, item) => total + item.timeSpent, 0);
    const ordered = [...lists].sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType));
    return <Card style={styles.card}>
        <View style={styles.totals}>
            {[
                { label: "Total time", Icon: Clock, value: `${formatNumber(summary.totalDays, { fractionDigits: 0, locale: "en" })} d` },
                { label: "Total entries", Icon: LibraryBig, value: formatNumber(summary.totalEntries, { locale: "en" }) },
            ].map(({ label, Icon, value }) => <View key={label} style={styles.total}>
                <View style={styles.labelRow}><Icon size={14} color={colors.muted}/><AppText muted style={styles.label}>{label}</AppText></View>
                <AppText style={styles.value}>{value}</AppText>
            </View>)}
        </View>
        <View style={styles.ratings}>
            <View style={styles.rating}><View style={styles.labelRow}><Star size={13} color={colors.rating}/><AppText muted style={styles.label}>Avg. rating</AppText></View>
                {summary.avgRated !== null && user.ratingSystem === "feeling" ? <FeelingIcon value={summary.avgRated} size={21}/> :
                    <AppText style={styles.ratingValue}>{formatNumber(summary.avgRated, { fractionDigits: 2, locale: "en" })}</AppText>}
            </View>
            <View style={styles.rating}><View style={styles.labelRow}><ChartNoAxesColumn size={13} color={colors.muted}/><AppText muted style={styles.label}>Rated
                media</AppText></View>
                <AppText style={styles.ratingValue}>{formatPercent(summary.percentRated)}</AppText>
            </View>
        </View>
        <View style={styles.distribution}>
            <AppText muted style={styles.distributionTitle}>TIME DISTRIBUTION</AppText>
            {totalHours === 0 ? <AppText muted style={styles.empty}>No time to display yet.</AppText> : <>
                <View style={styles.bar}>
                    {ordered.map(item => item.timeSpent > 0 && <View key={item.mediaType} accessible
                                                                     accessibilityLabel={`${mediaLabels[item.mediaType]}: ${formatPercent(item.timeSpent / totalHours * 100)}`}
                                                                     style={{ width: `${item.timeSpent / totalHours * 100}%`, backgroundColor: mediaColors[item.mediaType] }}/>)}
                </View>
                <View style={styles.legend}>{ordered.map(item => <View key={item.mediaType} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: mediaColors[item.mediaType] }]}/><AppText muted style={styles.legendLabel}>{mediaLabels[item.mediaType]} <AppText
                    style={styles.percent}>{formatPercent(item.timeSpent / totalHours * 100, { fractionDigits: 0 })}</AppText></AppText>
                </View>)}</View>
            </>}
        </View>
    </Card>;
}

const styles = StyleSheet.create({
    card: { borderRadius: 16 },
    totals: { padding: 16, flexDirection: "row", gap: 16 },
    total: { flex: 1, minWidth: 0, gap: 8 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    label: { fontSize: 12, lineHeight: 18 },
    value: { fontSize: 28, lineHeight: 36, fontWeight: "700", fontVariant: ["tabular-nums"] },
    ratings: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", gap: 16 },
    rating: { flex: 1, minWidth: 0, gap: 5 },
    ratingValue: { fontSize: 17, lineHeight: 24, fontWeight: "600", fontVariant: ["tabular-nums"] },
    distribution: { padding: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    distributionTitle: { fontSize: 10, lineHeight: 16, letterSpacing: 0.8, fontWeight: "600" },
    bar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5, flexBasis: "28%", flexGrow: 1 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    legendLabel: { fontSize: 10, lineHeight: 16, flexShrink: 1 },
    percent: { fontSize: 10, lineHeight: 16, fontVariant: ["tabular-nums"] },
    empty: { fontSize: 12, lineHeight: 18 },
});
