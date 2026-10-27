import {useMemo, useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Animated, FlatList, Pressable, RefreshControl, View} from "react-native";
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
    const visible = useMemo(() => data.filter(item => (mediaType === "all" || item.mediaType === mediaType) && (state === "all" || (state === "earned" ? item.tiers.every(tier => tier.completed) : !item.tiers.every(tier => tier.completed)))), [data, mediaType, state]);
    return <>
        <Animated.FlatList {...scrollProps} data={visible} initialNumToRender={5} maxToRenderPerBatch={5} windowSize={5}
                           contentContainerStyle={[{ paddingHorizontal: 16, gap: 12 }, contentContainerStyle]} keyExtractor={item => String(item.id)}
                           refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching} onRefresh={() => {
                               void query.refetch();
                               void recent.refetch();
                           }}/>}
                           ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 4 }}><View style={{ gap: 8 }}><AppText
                               style={{ fontSize: 30, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{earned} <AppText muted style={{ fontSize: 14 }}>tiers
                               earned</AppText></AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{difficulties.map(tier => <View key={tier} style={{
                               flexDirection: "row",
                               gap: 5,
                               alignItems: "center"
                           }}><Award size={16} color={achievementColors[tier]}/><AppText style={{
                               fontSize: 12,
                               color: achievementColors[tier]
                           }}>{capitalize(tier)} {highest.filter(value => value === tier).length}</AppText></View>)}</View></View>
                               {!!recent.data?.length && <View style={{ gap: 10 }}><AppText heading style={{ fontSize: 16 }}>Latest milestones</AppText><FlatList horizontal
                                                                                                                                                                  showsHorizontalScrollIndicator={false}
                                                                                                                                                                  data={recent.data}
                                                                                                                                                                  keyExtractor={item => `${item.id}:${item.difficulty}`}
                                                                                                                                                                  contentContainerStyle={{ gap: 10 }}
                                                                                                                                                                  renderItem={({ item }) =>
                                                                                                                                                                      <Pressable
                                                                                                                                                                          accessibilityRole="button"
                                                                                                                                                                          onPress={() => setSelectedId(item.id)}
                                                                                                                                                                          style={{
                                                                                                                                                                              width: 200,
                                                                                                                                                                              padding: 14,
                                                                                                                                                                              gap: 8,
                                                                                                                                                                              borderRadius: 16,
                                                                                                                                                                              backgroundColor: colors.surface
                                                                                                                                                                          }}><Award
                                                                                                                                                                          size={22}
                                                                                                                                                                          color={achievementColors[item.difficulty]}/><AppText
                                                                                                                                                                          numberOfLines={2}
                                                                                                                                                                          style={{
                                                                                                                                                                              fontSize: 13,
                                                                                                                                                                              fontWeight: "600"
                                                                                                                                                                          }}>{item.name}</AppText><AppText
                                                                                                                                                                          style={{
                                                                                                                                                                              fontSize: 11,
                                                                                                                                                                              color: achievementColors[item.difficulty]
                                                                                                                                                                          }}>{capitalize(item.difficulty)} · {formatDate(item.completedAt)}</AppText></Pressable>}/></View>}
                               <ChoiceChips label="Achievement media type" value={mediaType} onChange={setMediaType} options={[{
                                   value: "all",
                                   label: "All media"
                               }, ...ALL_MEDIA_TYPES.filter(type => data.some(item => item.mediaType === type)).map(value => ({
                                   value,
                                   label: mediaLabels[value],
                                   color: mediaColors[value]
                               }))]}/>
                               <ChoiceChips label="Achievement progress" value={state} onChange={setState}
                                            options={[{ value: "all", label: "All" }, { value: "progress", label: "In progress" }, { value: "earned", label: "Completed" }]}/>
                           </View>}
                           renderItem={({ item }) => {
                               const completed = item.tiers.filter(tier => tier.completed);
                               const next = item.tiers.find(tier => !tier.completed);
                               const current = next ?? item.tiers.at(-1)!;
                               const color = completed.length ? achievementColors[completed.at(-1)!.difficulty] : colors.muted;
                               const MediaIcon = mediaIcons[item.mediaType];
                               return <Pressable accessibilityRole="button"
                                                 accessibilityLabel={`${item.name}, ${completed.length} of ${item.tiers.length} tiers earned. View tiers.`}
                                                 onPress={() => setSelectedId(item.id)}
                                                 style={{ padding: 16, gap: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                                   <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><MediaIcon size={13} color={mediaColors[item.mediaType]}/><AppText
                                       style={{ fontSize: 11, color: mediaColors[item.mediaType], flex: 1 }}>{mediaLabels[item.mediaType]}</AppText><AppText muted
                                                                                                                                                             style={{ fontSize: 11 }}>{completed.length}/{item.tiers.length} tiers</AppText><ChevronRight
                                       size={15} color={colors.muted}/></View>
                                   <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><Award size={22} color={color}/><AppText
                                       style={{ fontSize: 16, fontWeight: "600", flex: 1 }}>{item.name}</AppText></View><AppText muted numberOfLines={2} style={{
                                   fontSize: 13,
                                   lineHeight: 20
                               }}>{item.description}</AppText>
                                   <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><AppText style={{
                                       fontSize: 11,
                                       color: achievementColors[current.difficulty]
                                   }}>{next ? `Next · ${capitalize(next.difficulty)}` : "All tiers earned"}</AppText><AppText muted
                                                                                                                              style={{ fontSize: 11 }}>{current.count}/{current.criteria.count}</AppText></View><ProgressBar
                                   value={current.completed ? 100 : current.progress} color={achievementColors[current.difficulty]}/>
                               </Pressable>;
                           }}
                           ListEmptyComponent={<StateView loading={query.isPending}
                                                          title={query.error ? "Couldn’t load achievements" : state === "earned" ? "No completed achievements yet" : "No achievements found"}
                                                          message={query.error?.message} retry={query.error ? () => void query.refetch() : undefined}/>}/>
        {selected &&
            <ActionSheet title={selected.name} dismiss={() => setSelectedId(null)}><AppText muted>{selected.description}</AppText>{selected.tiers.map(tier => <View key={tier.id}
                                                                                                                                                                    style={{
                                                                                                                                                                        gap: 10,
                                                                                                                                                                        paddingVertical: 8
                                                                                                                                                                    }}><View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Award size={20} color={achievementColors[tier.difficulty]}/><AppText
                style={{ flex: 1, fontWeight: "600", color: achievementColors[tier.difficulty] }}>{capitalize(tier.difficulty)}</AppText>{tier.completed &&
                <Check size={18} color={achievementColors[tier.difficulty]}/>}</View><ProgressBar value={tier.completed ? 100 : tier.progress}
                                                                                                  color={achievementColors[tier.difficulty]}/><AppText muted
                                                                                                                                                       style={{ fontSize: 12 }}>{tier.count}/{tier.criteria.count}{tier.completedAt ? ` · ${formatDate(tier.completedAt)}` : ` · ${Math.round(tier.progress)}%`}</AppText><AppText
                muted style={{ fontSize: 11 }}>{tier.rarity ? `${formatPercent(tier.rarity)} rarity` : "Never reached"}</AppText></View>)}</ActionSheet>}
    </>;
}
