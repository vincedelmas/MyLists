import {memo} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {CircleCheck, EyeOff, History, Pencil, RotateCcw, TrendingUp} from "lucide-react-native";
import {formatDate} from "@/lib/utils/formatting/date";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {AppText, Cover} from "../../components/ui";
import {mediaColors, mediaIcons, mediaLabels} from "../../lib/media";
import {colors} from "../../theme";
import type {MediaLayout} from "../../components/layout-toggle";
import {formatActivityProgress, getActivitySignals, type ActivityPeriod, type ActivityRow} from "./activity-utils";


export function ActivitySignals({ row, view }: { row: Parameters<typeof getActivitySignals>[0]; view: ActivityPeriod["view"] }) {
    const label = getActivitySignals(row, view)[0];
    if (!label) return null;
    const Icon = label === "Completed"
        ? CircleCheck
        : label === "Hidden" ? EyeOff : label.startsWith("Re-experienced") ? RotateCcw : TrendingUp;

    return (
        <View
            accessible
            accessibilityLabel={label}
            style={styles.signals}
        >
            <Icon
                size={18}
                color={label === "Completed" ? colors.accent : label === "Hidden" ? colors.muted : colors.info}
            />
        </View>
    );

}


export const ActivityCard = memo(function ActivityCard({ row, layout, view, canEdit, onOpen, onManage }: {
    row: ActivityRow; layout: MediaLayout; view: ActivityPeriod["view"]; canEdit: boolean; onOpen: (row: ActivityRow) => void; onManage: (row: ActivityRow) => void;
}) {
    const Icon = mediaIcons[row.mediaType];
    const grid = layout === "grid";
    const progressLabel = row.mediaType !== "games" && row.progressGained > 0 ? formatActivityProgress(row) : null;
    const actionable = view === "year" ? !!row.occurrences?.length : canEdit;
    const ManageIcon = view === "year" ? History : Pencil;

    return (
        <View style={[styles.cell, grid && styles.gridCell]}>
            <View style={[styles.card, !grid && styles.listCard]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${row.mediaName}, ${progressLabel ? `${progressLabel}, ` : ""}${formatMinutes(row.timeGained)}. Open media details`}
                    onPress={() => onOpen(row)}
                    style={({ pressed }) => [styles.body, grid ? styles.gridBody : styles.listBody, pressed && styles.pressed]}
                >
                    <Cover
                        uri={row.mediaCover}
                        label={row.mediaName}
                        style={grid ? styles.gridCover : styles.listCover}
                    />
                    <View style={[styles.details, grid && styles.gridDetails]}>
                        <View style={styles.mediaType}>
                            <Icon
                                size={12}
                                color={mediaColors[row.mediaType]}
                            />
                            <AppText
                                style={[
                                    styles.mediaLabel,
                                    { color: mediaColors[row.mediaType] }
                                ]}
                            >
                                {mediaLabels[row.mediaType]}
                            </AppText>
                            <ActivitySignals row={row} view={view}/>
                        </View>
                        <AppText numberOfLines={2} style={styles.name}>
                            {row.mediaName}
                        </AppText>
                        <View style={styles.metrics}>
                            <AppText style={styles.time}>
                                {formatMinutes(row.timeGained, { compact: true })}
                            </AppText>
                            {progressLabel &&
                                <AppText muted style={styles.progress}>
                                    {progressLabel}
                                </AppText>
                            }
                        </View>
                        <AppText muted style={styles.date}>
                            {formatDate(row.lastActivityAt)}
                        </AppText>
                    </View>
                </Pressable>
                {actionable &&
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={view === "year" ? `View months for ${row.mediaName}` : `Edit monthly activity for ${row.mediaName}`}
                        onPress={() => onManage(row)}
                        style={({ pressed }) => [styles.manage, grid && styles.gridManage, pressed && styles.pressed]}
                    >
                        <ManageIcon size={17} color={colors.accent}/>
                        {grid &&
                            <AppText style={styles.manageLabel}>
                                {view === "year" ? `${row.occurrences!.length} ${row.occurrences!.length === 1 ? "month" : "months"}` : "Edit summary"}
                            </AppText>
                        }
                    </Pressable>
                }
            </View>
        </View>
    );
});


const styles = StyleSheet.create({
    cell: { flex: 1, padding: 6 },
    gridCell: { maxWidth: "50%" },
    card: {
        borderRadius: 15,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: "hidden"
    },
    listCard: { flexDirection: "row", alignItems: "center" },
    body: { minWidth: 0 },
    listBody: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        gap: 12
    },
    gridBody: { flexDirection: "column" },
    gridCover: {
        width: "100%",
        height: undefined,
        aspectRatio: 2 / 3,
        borderRadius: 0
    },
    listCover: { width: 70, height: 105, borderRadius: 8 },
    details: { flex: 1, minWidth: 0, gap: 6 },
    gridDetails: { padding: 12 },
    name: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    mediaType: { flexDirection: "row", alignItems: "center", gap: 4 },
    mediaLabel: { fontSize: 10, lineHeight: 16 },
    metrics: { gap: 3 },
    time: {
        fontSize: 16,
        lineHeight: 22,
        fontWeight: "600",
        fontVariant: ["tabular-nums"]
    },
    progress: { fontSize: 11, lineHeight: 16 },
    signals: { marginLeft: "auto", alignItems: "center", justifyContent: "center" },
    date: { fontSize: 10, lineHeight: 16 },
    manage: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center"
    },
    gridManage: {
        flexDirection: "row",
        gap: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border
    },
    manageLabel: { fontSize: 11, lineHeight: 16, color: colors.accent },
    pressed: { opacity: 0.6 },
});
