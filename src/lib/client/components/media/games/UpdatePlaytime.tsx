import {UpdateType} from "@/lib/utils/enums";
import {KeyboardEvent, useState} from "react";
import {Input} from "@/lib/client/components/ui/input";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UpdatePlaytimeProps {
    playtimeInMin: number;
    updatePlaytime: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdatePlaytime = ({ playtimeInMin, updatePlaytime }: UpdatePlaytimeProps) => {
    const maxPlaytimeHours = 30000;
    const playtimeInHours = playtimeInMin / 60;
    const [currentValue, setCurrentValue] = useState(playtimeInHours.toString());

    const validateAndMutate = () => {
        if (currentValue.trim() === "") {
            setCurrentValue(playtimeInHours.toString());
            return;
        }

        const parsedValue = Number(currentValue);
        if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue)) {
            setCurrentValue(playtimeInHours.toString());
            return;
        }
        if (parsedValue < 0 || parsedValue > maxPlaytimeHours) {
            setCurrentValue(playtimeInHours.toString());
            return;
        }

        const nextPlaytimeInMin = Math.round(parsedValue * 60);
        if (nextPlaytimeInMin === playtimeInMin) {
            setCurrentValue(playtimeInHours.toString());
            return;
        }

        updatePlaytime.mutate({
            payload: {
                type: UpdateType.PLAYTIME,
                playtime: nextPlaytimeInMin,
            }
        });
    };

    const handleOnKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            ev.currentTarget.blur();
        }
    };

    return (
        <div className="flex justify-between items-center">
            <div>Playtime (h)</div>
            <Input
                min={0}
                step={1}
                type="number"
                inputMode="numeric"
                value={currentValue}
                max={maxPlaytimeHours}
                onKeyDown={handleOnKeyDown}
                className="w-34 h-8 text-sm"
                disabled={updatePlaytime.isPending}
                onBlur={() => validateAndMutate()}
                onChange={(ev) => setCurrentValue(ev.target.value)}
            />
        </div>
    );
};
