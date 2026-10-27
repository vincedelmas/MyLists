import {useMemo, useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {StyleSheet, Animated, FlatList, Pressable, RefreshControl, View} from "react-native";
import {Award, Check, ChevronRight} from "lucide-react-native";
import {AchievementDifficulty} from "@/lib/utils/enums";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {formatDate} from "@/lib/utils/formatting/date";
import {formatPercent} from "@/lib/utils/formatting/number";
import {capitalize} from "@/lib/utils/formatting/text";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {AppText, StateView} from "../../components/ui";
import {ActionSheet} from "../../components/action-sheet";
import {ChoiceChips} from "../../components/choice-chips";
import {ProgressBar} from "../../components/ProgressBar";
import {achievementsOptions, recentAchievementsOptions} from "../../lib/react-query/query-options/profile.options";
import {mediaColors, mediaIcons, mediaLabels} from "../../lib/media";
import {achievementColors, colors} from "../../theme";


const difficulties = Object.values(AchievementDifficulty);


export function AchievementsContent({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const query = useQuery({ ...achievementsOptions(userId), enabled: focused });
    const recent = useQuery({ ...recentAchievementsOptions(userId), enabled: focused });
    const [mediaType, setMediaType] = useState("all");
    const [state, setState] = useState<"all" | "earned" | "progress">("all");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const data = useMemo(() => query.data?.map(item => ({
        ...item,
        tiers: [...item.tiers].sort((a, b) => difficulties.indexOf(a.difficulty) - difficulties.indexOf(b.difficulty))
    })) ?? [], [query.data]);
    const selected = data.find(item => item.id === selectedId);
    const earned = useMemo(() => data.reduce((total, item) => total + item.tiers.filter(tier => tier.completed).length, 0), [data]);
    const highest = useMemo(() => data.map(item => item.tiers.filter(tier => tier.completed).at(-1)?.difficulty), [data]);
    const visible = useMemo(() => data.filter(item => {
        if (mediaType !== "all" && item.mediaType !== mediaType) return false;
        if (state === "all") return true;

        const completed = item.tiers.every(tier => tier.completed);

        return state === "earned" ? completed : !completed;
    }), [data, mediaType, state]);

    return (
        <>
            <Animated.FlatList
                {...scrollProps}
                data={visible}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                contentContainerStyle={[
                    styles.content,
                    contentContainerStyle
                ]}
                keyExtractor={item => String(item.id)}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        refreshing={query.isRefetching}
                        onRefresh={() => {
                            void query.refetch();
                            void recent.refetch();
                        }}
                    />
                }
                ListHeaderComponent={
                    <View style={styles.header}>
                        <View style={styles.summary}>
                            <AppText
                                style={styles.title}
                            >{earned} <AppText
                                muted
                                style={styles.earnedLabel}
                            >
                                tiers
                                earned
                            </AppText></AppText>
                            <View style={styles.tierSummary}>
                                {difficulties.map(tier =>
                                    <View
                                        key={tier}
                                        style={styles.tierCount}
                                    >
                                        <Award
                                            size={16}
                                            color={achievementColors[tier]}
                                        />
                                        <AppText
                                            style={[styles.tierDetail, { color: achievementColors[tier] }]}
                                        >{capitalize(tier)} {highest.filter(value => value === tier).length}</AppText>
                                    </View>)
                                }
                            </View>
                        </View>
                        {!!recent.data?.length &&
                            <View style={styles.milestones}>
                                <AppText
                                    heading
                                    style={styles.sectionTitle}
                                >
                                    Latest milestones
                                </AppText>
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    data={recent.data}
                                    keyExtractor={item => `${item.id}:${item.difficulty}`}
                                    contentContainerStyle={styles.milestones}
                                    renderItem={({ item }) =>
                                        <Pressable
                                            accessibilityRole="button"
                                            onPress={() => setSelectedId(item.id)}
                                            style={styles.milestoneCard}
                                        >
                                            <Award
                                                size={22}
                                                color={achievementColors[item.difficulty]}
                                            />
                                            <AppText
                                                numberOfLines={2}
                                                style={styles.milestoneName}
                                            >
                                                {item.name}
                                            </AppText>
                                            <AppText
                                                style={[styles.metadata, { color: achievementColors[item.difficulty] }]}
                                            >{capitalize(item.difficulty)} · {formatDate(item.completedAt)}</AppText>
                                        </Pressable>
                                    }
                                />
                            </View>
                        }
                        <ChoiceChips
                            label="Achievement media type"
                            value={mediaType}
                            onChange={setMediaType}
                            options={[
                                {
                                    value: "all",
                                    label: "All media"
                                },
                                ...ALL_MEDIA_TYPES.filter(type => data.some(item => item.mediaType === type)).map(value => ({
                                    value,
                                    label: mediaLabels[value],
                                    color: mediaColors[value]
                                }))
                            ]}
                        />
                        <ChoiceChips
                            label="Achievement progress"
                            value={state}
                            onChange={setState}
                            options={[
                                { value: "all", label: "All" },
                                { value: "progress", label: "In progress" },
                                { value: "earned", label: "Completed" }
                            ]}
                        />
                    </View>
                }
                renderItem={({ item }) => {
                    const completed = item.tiers.filter(tier => tier.completed);
                    const next = item.tiers.find(tier => !tier.completed);
                    const current = next ?? item.tiers.at(-1)!;
                    const color = completed.length ? achievementColors[completed.at(-1)!.difficulty] : colors.muted;
                    const MediaIcon = mediaIcons[item.mediaType];

                    return (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${item.name}, ${completed.length} of ${item.tiers.length} tiers earned. View tiers.`}
                            onPress={() => setSelectedId(item.id)}
                            style={styles.achievementCard}
                        >
                            <View style={styles.mediaRow}>
                                <MediaIcon
                                    size={13}
                                    color={mediaColors[item.mediaType]}
                                />
                                <AppText
                                    style={[styles.mediaLabel, { color: mediaColors[item.mediaType] }]}
                                >
                                    {mediaLabels[item.mediaType]}
                                </AppText>
                                <AppText
                                    muted
                                    style={styles.metadata}
                                >{completed.length}/{item.tiers.length} tiers</AppText>
                                <ChevronRight size={15} color={colors.muted}/>
                            </View>
                            <View style={styles.achievementHeading}>
                                <Award size={22} color={color}/>
                                <AppText
                                    style={styles.heading}
                                >
                                    {item.name}
                                </AppText>
                            </View>
                            <AppText
                                muted
                                numberOfLines={2}
                                style={styles.description}
                            >
                                {item.description}
                            </AppText>
                            <View style={styles.progressSummary}>
                                <AppText
                                    style={[styles.metadata, { color: achievementColors[current.difficulty] }]}
                                >
                                    {next ? `Next · ${capitalize(next.difficulty)}` : "All tiers earned"}
                                </AppText>
                                <AppText
                                    muted
                                    style={styles.metadata}
                                >{current.count}/{current.criteria.count}</AppText>
                            </View>
                            <ProgressBar
                                value={current.completed ? 100 : current.progress}
                                color={achievementColors[current.difficulty]}
                            />
                        </Pressable>
                    );
                }
                }
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={query.error
                            ? "Couldn’t load achievements"
                            : state === "earned" ? "No completed achievements yet" : "No achievements found"}
                        message={query.error?.message}
                        retry={query.error ? () => void query.refetch() : undefined}
                    />
                }
            />
            {selected &&
                <ActionSheet
                    title={selected.name}
                    dismiss={() => setSelectedId(null)}
                >
                    <AppText muted>
                        {selected.description}
                    </AppText>
                    {selected.tiers.map(tier =>
                        <View
                            key={tier.id}
                            style={styles.tierSection}
                        >
                            <View
                                style={styles.tierHeading}
                            >
                                <Award
                                    size={20}
                                    color={achievementColors[tier.difficulty]}
                                />
                                <AppText
                                    style={[styles.tierName, { color: achievementColors[tier.difficulty] }]}
                                >
                                    {capitalize(tier.difficulty)}
                                </AppText>
                                {tier.completed &&
                                    <Check
                                        size={18}
                                        color={achievementColors[tier.difficulty]}
                                    />
                                }
                            </View>
                            <ProgressBar
                                value={tier.completed ? 100 : tier.progress}
                                color={achievementColors[tier.difficulty]}
                            />
                            <AppText
                                muted
                                style={styles.tierDetail}
                            >{tier.count}/{tier.criteria.count}{tier.completedAt ? ` · ${formatDate(tier.completedAt)}` : ` · ${Math.round(tier.progress)}%`}</AppText>
                            <AppText
                                muted
                                style={styles.metadata}
                            >
                                {tier.rarity ? `${formatPercent(tier.rarity)} rarity` : "Never reached"}
                            </AppText>
                        </View>)
                    }
                </ActionSheet>
            }
        </>
    );
}


const styles = StyleSheet.create({
    content: { paddingHorizontal: 16, gap: 12 },
    header: { gap: 16, paddingBottom: 4 },
    summary: { gap: 8 },
    title: {
        fontSize: 30,
        fontWeight: "700",
        fontVariant: ["tabular-nums"]
    },
    earnedLabel: { fontSize: 14 },
    tierSummary: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    tierCount: {
        flexDirection: "row",
        gap: 5,
        alignItems: "center"
    },
    tierDetail: { fontSize: 12 },
    milestones: { gap: 10 },
    sectionTitle: { fontSize: 16 },
    milestoneCard: {
        width: 200,
        padding: 14,
        gap: 8,
        borderRadius: 16,
        backgroundColor: colors.surface
    },
    milestoneName: {
        fontSize: 13,
        fontWeight: "600"
    },
    metadata: { fontSize: 11 },
    achievementCard: {
        padding: 16,
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface
    },
    mediaRow: { flexDirection: "row", gap: 6, alignItems: "center" },
    mediaLabel: { flex: 1, fontSize: 11 },
    achievementHeading: { flexDirection: "row", gap: 10, alignItems: "center" },
    heading: { fontSize: 16, fontWeight: "600", flex: 1 },
    description: {
        fontSize: 13,
        lineHeight: 20
    },
    progressSummary: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    tierSection: {
        gap: 10,
        paddingVertical: 8
    },
    tierHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
    tierName: { flex: 1, fontWeight: "600" },
});
