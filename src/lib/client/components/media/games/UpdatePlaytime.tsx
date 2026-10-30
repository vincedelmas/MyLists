import {UpdateType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {useNumericEdit} from "@/lib/client/components/media/base/use-numeric-edit";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {toActivityDisplayValue, toActivityStoredValue} from "@/lib/utils/media/activity";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UpdatePlaytimeProps {
    playtimeInMin: number;
    updatePlaytime: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdatePlaytime = ({ playtimeInMin, updatePlaytime }: UpdatePlaytimeProps) => {
    const maxPlaytimeHours = 30_000;
    const playtimeInHours = toActivityDisplayValue(gamesDefinition.identity.mediaType, playtimeInMin);

    const input = useNumericEdit({
        value: playtimeInHours,
        validate: (value) => value >= 0 && value <= maxPlaytimeHours,
        onCommit: async (value) => {
            const playtime = Math.round(toActivityStoredValue(gamesDefinition.identity.mediaType, value));
            if (playtime === playtimeInMin) return false;

            return Boolean(await updatePlaytime.mutateAsync({ payload: { type: UpdateType.PLAYTIME, playtime } }));
        },
    });

    return (
        <div className="flex justify-between items-center">
            <div>Playtime ({gamesDefinition.statistics.durationDistribution.unit})</div>
            <MediaSaveFeedback mutation={updatePlaytime} field="playtime">
                {saveDisabled => (
                    <Input
                        {...input}
                        min={0}
                        step={1}
                        type="number"
                        inputMode="numeric"
                        max={maxPlaytimeHours}
                        disabled={saveDisabled}
                        aria-label="Playtime (hours)"
                        className="w-34 h-7 rounded-md"
                    />
                )}
            </MediaSaveFeedback>
        </div>
    );
};
