import {useMutation, useQueryClient} from "@tanstack/react-query";
import {ArrowUpRight} from "lucide-react-native";
import {View, Pressable} from "react-native";
import type {ContinueProgress} from "@/lib/utils/media/continue";
import {api, type MediaType} from "../../lib/api-client";
import {AppText, Button, Cover} from "../../components/ui";
import {ProgressBar} from "../../components/ProgressBar";
import {useTabPush} from "../../hooks/use-tab-push";
import {mediaColors, mediaLabels} from "../../lib/media";
import {colors} from "../../theme";
import {ActionSheet} from "../../components/action-sheet";

interface ContinueItem {
    mediaId: number;
    mediaType: MediaType;
    name: string;
    cover: string | null;
    progress?: ContinueProgress;
}

export function ContinueActions({ item, dismiss }: { item: ContinueItem; dismiss: () => void }) {
    const client = useQueryClient();
    const push = useTabPush();
    const mutation = useMutation({
        mutationFn: () => {
            if (item.mediaType === "movies") throw new Error("Movies cannot be continued.");
            return api.continueMedia({ mediaType: item.mediaType, mediaId: item.mediaId });
        },
        onSuccess: async (result) => {
            if (!result.available) dismiss();
            await Promise.all(["profile", "lists", "media"].map(key => client.invalidateQueries({ queryKey: [key] })));
        },
    });

    return (
        <ActionSheet title={item.name} compact dismiss={dismiss} error={mutation.error?.message}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <Cover uri={item.cover} label={item.name} style={{ width: 64, height: 96, borderRadius: 8 }}/>
                <View style={{ flex: 1, gap: 6 }}>
                    <AppText style={{ color: mediaColors[item.mediaType], fontSize: 11, fontWeight: "600" }}>{mediaLabels[item.mediaType]}</AppText>
                    <AppText heading numberOfLines={2} style={{ fontSize: 18, lineHeight: 24 }}>{item.name}</AppText>
                    {item.progress && <AppText muted style={{ fontSize: 12 }}>{item.progress.label}</AppText>}
                </View>
            </View>
            {item.progress?.total != null && item.progress.total > 0 &&
                <ProgressBar value={Math.min(100, item.progress.value / item.progress.total * 100)} color={mediaColors[item.mediaType]}/>}
            <View style={{ gap: 8 }}>
                {item.progress &&
                    <Button fullWidth label={item.progress.actionLabel} disabled={!item.progress.update} pending={mutation.isPending} onPress={() => mutation.mutate()}/>}
                <Pressable accessibilityRole="button" onPress={() => {
                    dismiss();
                    push({ pathname: "/media/[mediaType]/[mediaId]", params: { mediaType: item.mediaType, mediaId: String(item.mediaId) } });
                }} style={({ pressed }) => ({
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    opacity: pressed ? 0.6 : 1
                })}>
                    <AppText muted style={{ fontSize: 13 }}>Go to the details</AppText>
                    <ArrowUpRight size={17} color={colors.muted}/>
                </Pressable>
            </View>
        </ActionSheet>
    );
}
