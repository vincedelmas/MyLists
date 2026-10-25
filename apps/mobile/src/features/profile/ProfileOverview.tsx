import {View} from "react-native";
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
    const metrics = [
        { label: "Total time", Icon: Clock, value: `${formatNumber(summary.totalDays, { fractionDigits: 0, locale: "en" })} d` },
        { label: "Total entries", Icon: LibraryBig, value: formatNumber(summary.totalEntries, { locale: "en" }) },
        {
            label: "Avg. rating",
            Icon: Star,
            value: summary.avgRated !== null && user.ratingSystem === "feeling" ?
                <FeelingIcon value={summary.avgRated} size={24}/> : formatNumber(summary.avgRated, { fractionDigits: 2, locale: "en" })
        },
        { label: "Rated media", Icon: ChartNoAxesColumn, value: formatPercent(summary.percentRated) },
    ];

    return (
        <Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 20 }}>
                {metrics.map(({ label, Icon, value }) => (
                    <View key={label} style={{ flexBasis: "44%", flexGrow: 1, gap: 6 }}>
                        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                            <Icon size={14} color={colors.muted}/>
                            <AppText muted style={{ fontSize: 11 }}>{label}</AppText>
                        </View>
                        {typeof value === "string" ? <AppText style={{ fontSize: 23, lineHeight: 30, fontWeight: "700" }}>{value}</AppText> : value}
                    </View>
                ))}
            </View>
            <View style={{ padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                <AppText muted style={{ fontSize: 11, fontWeight: "600" }}>TIME DISTRIBUTION</AppText>
                {totalHours === 0 ? <AppText muted>No time to display yet.</AppText> : (
                    <>
                        <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden" }}>
                            {ordered.map(item => item.timeSpent > 0 &&
                                <View key={item.mediaType} accessibilityLabel={`${mediaLabels[item.mediaType]}: ${formatPercent(item.timeSpent / totalHours * 100)}`}
                                      style={{ width: `${item.timeSpent / totalHours * 100}%`, backgroundColor: mediaColors[item.mediaType] }}/>)}
                        </View>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                            {ordered.map(item => (
                                <View key={item.mediaType} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: mediaColors[item.mediaType] }}/>
                                    <AppText muted
                                             style={{ fontSize: 10 }}>{mediaLabels[item.mediaType]} {formatPercent(item.timeSpent / totalHours * 100, { fractionDigits: 0 })}</AppText>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </View>
        </Card>
    );
}
