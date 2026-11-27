import {Trophy} from "lucide-react";
import {UpdateType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {DEFAULT_DASH_FALLBACK, PROGRESS_MAX} from "@/lib/utils/constants";
import {type FocusEvent, type KeyboardEvent, useRef, useState} from "react";
import {getGameAchievementPercent} from "@/lib/utils/media/game-achievements";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UpdateAchievementsProps {
    disabled?: boolean;
    achievementsTotal: number | null;
    achievementsUnlocked: number | null;
    updateAchievements: ReturnType<typeof useUpdateUserMediaMutation>;
}


const formatValue = (value: number | null) => value === null ? "" : String(value);


export const UpdateAchievements = ({ achievementsUnlocked, achievementsTotal, updateAchievements, disabled = false }: UpdateAchievementsProps) => {
    const totalInputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState({
        editing: false,
        syncedTotal: achievementsTotal,
        syncedUnlocked: achievementsUnlocked,
        totalDraft: formatValue(achievementsTotal),
        unlockedDraft: formatValue(achievementsUnlocked),
    });

    if (state.syncedUnlocked !== achievementsUnlocked || state.syncedTotal !== achievementsTotal) {
        setState({
            ...state,
            syncedTotal: achievementsTotal,
            syncedUnlocked: achievementsUnlocked,
            totalDraft: state.editing ? state.totalDraft : formatValue(achievementsTotal),
            unlockedDraft: state.editing ? state.unlockedDraft : formatValue(achievementsUnlocked),
        });
    }

    const percent = getGameAchievementPercent(achievementsUnlocked, achievementsTotal);

    const reset = () => {
        setState((current) => ({
            ...current,
            editing: false,
            totalDraft: formatValue(current.syncedTotal),
            unlockedDraft: formatValue(current.syncedUnlocked),
        }));
    };

    const commit = async () => {
        const totalTrimmed = state.totalDraft.trim();
        const unlockedTrimmed = state.unlockedDraft.trim();

        if (unlockedTrimmed === "" && totalTrimmed === "") {
            if (achievementsUnlocked === null && achievementsTotal === null) {
                reset();
                return;
            }
            try {
                if (!await updateAchievements.mutateAsync({
                    payload: {
                        achievementsTotal: null,
                        achievementsUnlocked: null,
                        type: UpdateType.ACHIEVEMENTS,
                    },
                })) reset();
            }
            catch {
                reset();
            }
            return;
        }

        if (unlockedTrimmed === "" || totalTrimmed === "") {
            reset();
            return;
        }

        const nextTotal = Number(totalTrimmed);
        const nextUnlocked = Number(unlockedTrimmed);

        const valid = Number.isInteger(nextUnlocked)
            && Number.isInteger(nextTotal)
            && nextUnlocked >= 0
            && nextTotal >= 1
            && nextTotal <= PROGRESS_MAX
            && nextUnlocked <= nextTotal;

        if (!valid || (nextUnlocked === achievementsUnlocked && nextTotal === achievementsTotal)) {
            reset();
            return;
        }

        try {
            if (!await updateAchievements.mutateAsync({
                payload: {
                    achievementsTotal: nextTotal,
                    type: UpdateType.ACHIEVEMENTS,
                    achievementsUnlocked: nextUnlocked,
                },
            })) reset();
        }
        catch {
            reset();
        }
    };

    const handleContainerBlur = (ev: FocusEvent<HTMLDivElement>) => {
        if (ev.currentTarget.contains(ev.relatedTarget)) return;
        setState((current) => ({ ...current, editing: false }));
        void commit();
    };

    const handleUnlockedKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            if (state.totalDraft.trim() === "") {
                totalInputRef.current?.focus();
            }
            else {
                ev.currentTarget.blur();
            }
        }
    };

    const handleTotalKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            ev.currentTarget.blur();
        }
    };

    return (
        <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5">
                <span>Achievements</span>
                {percent !== null &&
                    <span
                        className={percent === 100
                            ? "inline-flex items-center gap-0.5 text-xs font-medium text-amber-400"
                            : "inline-flex items-center gap-0.5 text-xs text-muted-foreground"
                        }
                    >
                        <Trophy className="size-3" aria-hidden="true"/>
                        {percent}%
                    </span>
                }
            </div>
            <MediaSaveFeedback
                disabled={disabled}
                mutation={updateAchievements}
                field={["achievementsUnlocked", "achievementsTotal"]}
            >
                {(saveDisabled) =>
                    <div
                        onBlur={handleContainerBlur}
                        className="flex w-34 items-center gap-1"
                        onFocus={() => setState(curr => ({ ...curr, editing: true }))}
                    >
                        <Input
                            min={0}
                            step={1}
                            type="number"
                            max={PROGRESS_MAX}
                            inputMode="numeric"
                            disabled={saveDisabled}
                            value={state.unlockedDraft}
                            onKeyDown={handleUnlockedKeyDown}
                            aria-label="Unlocked achievements"
                            placeholder={DEFAULT_DASH_FALLBACK}
                            className="h-7 min-w-0 flex-1 rounded-md px-1.5 text-center"
                            onChange={(ev) => setState(curr => ({ ...curr, unlockedDraft: ev.target.value }))}
                        />
                        <span className="shrink-0 text-xs text-muted-foreground">/</span>
                        <Input
                            min={1}
                            step={1}
                            type="number"
                            max={PROGRESS_MAX}
                            inputMode="numeric"
                            ref={totalInputRef}
                            disabled={saveDisabled}
                            value={state.totalDraft}
                            onKeyDown={handleTotalKeyDown}
                            aria-label="Total achievements"
                            placeholder={DEFAULT_DASH_FALLBACK}
                            className="h-7 min-w-0 flex-1 rounded-md px-1.5 text-center"
                            onChange={(ev) => setState(curr => ({ ...curr, totalDraft: ev.target.value }))}
                        />
                    </div>
                }
            </MediaSaveFeedback>
        </div>
    );
};
