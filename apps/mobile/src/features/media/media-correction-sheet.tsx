import {useMemo, useState} from "react";
import {View} from "react-native";
import {ActionSheet} from "../../components/action-sheet";
import {AppText, Button, Select} from "../../components/ui";
import {allocateActivityCorrection} from "@/lib/utils/media/activity";
import {formatMonthYear} from "@/lib/utils/formatting/date";
import type {ActivityCorrectionPreview} from "@/lib/types/activity.types";
import type {UpdateInput} from "../../lib/api-client";
import {formatActivityProgress} from "../activity/activity-utils";
import type {MediaParams} from "../../lib/api-client";

export function MediaCorrectionSheet({ preview, media, pending, error, confirm, dismiss }: {
    preview: ActivityCorrectionPreview;
    media: MediaParams;
    pending: boolean;
    error?: string;
    confirm: (choice: NonNullable<UpdateInput["activityCorrection"]>) => void;
    dismiss: () => void
}) {
    const [start, setStart] = useState("");
    const allocation = useMemo(() => allocateActivityCorrection(preview, start || undefined), [preview, start]);
    return <ActionSheet title="Review activity correction" error={error} dismiss={dismiss}>
        <AppText muted>Reducing progress can change your monthly history. Keep the recorded history, or choose where to begin removing contributions.</AppText>
        <Select label="Adjust backwards from" value={start} disabled={pending} onChange={setStart}
                options={[{ value: "", label: "Most recent month" }, ...preview.months.map(month => ({
                    value: month.monthBucket,
                    label: formatMonthYear(`${month.monthBucket}-01`)
                }))]}/>
        <View style={{ gap: 12 }}>{allocation.changes.map(change => <View key={change.id}
                                                                          style={{ gap: 5 }}><AppText>{formatMonthYear(`${change.monthBucket}-01`)}</AppText><AppText
            muted>{formatActivityProgress({ mediaType: media.mediaType, progressGained: change.progressRemoved })} removed · {change.redoRemoved} re-experiences
            removed</AppText></View>)}</View>
        <Button fullWidth secondary label="Keep history" pending={pending} onPress={() => confirm({ version: preview.version, keepHistory: true })}/>
        <Button fullWidth danger label="Adjust history" pending={pending} onPress={() => confirm({ version: preview.version, ...(start ? { startMonth: start } : {}) })}/>
        <Button fullWidth secondary label="Cancel" disabled={pending} onPress={dismiss}/>
    </ActionSheet>;
}
