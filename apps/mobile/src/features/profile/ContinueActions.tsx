import {useMutation, useQueryClient} from "@tanstack/react-query";
import {View} from "react-native";
import type {ContinueProgress} from "@/lib/utils/media/continue";
import {api, type MediaType} from "../../lib/api-client";
import {AppText, Button, Cover} from "../../components/ui";
import {ProgressBar} from "../../components/ProgressBar";
import {useTabPush} from "../../hooks/use-tab-push";
import {mediaColors} from "../../lib/media";
import {TrackingSheet} from "../media/tracking-sheet";

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
        <TrackingSheet title={item.name} dismiss={dismiss} error={mutation.error?.message}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <Cover uri={item.cover} label={item.name} style={{ width: 80, height: 120 }}/>
                {item.progress && (
                    <View style={{ flex: 1, gap: 12 }}>
                        <AppText>{item.progress.label}</AppText>
                        {item.progress.total !== null && item.progress.total > 0 &&
                            <ProgressBar value={Math.min(100, item.progress.value / item.progress.total * 100)} color={mediaColors[item.mediaType]}/>}
                    </View>
                )}
            </View>
            {item.progress && <Button label={item.progress.actionLabel} disabled={!item.progress.update} pending={mutation.isPending} onPress={() => mutation.mutate()}/>}
            <Button label="Go to the details" secondary onPress={() => {
                dismiss();
                push({ pathname: "/media/[mediaType]/[mediaId]", params: { mediaType: item.mediaType, mediaId: String(item.mediaId) } });
            }}/>
        </TrackingSheet>
    );
}
