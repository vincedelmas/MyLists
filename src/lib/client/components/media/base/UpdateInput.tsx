import React, {useState} from "react";
import {UpdateType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UpdateInputProps {
    initValue: number | null;
    total: number | null | undefined;
    updateInput: ReturnType<typeof useUpdateUserMediaMutation>;
    updateType: typeof UpdateType.PAGE | typeof UpdateType.CHAPTER;
}


export const UpdateInput = ({ total, initValue, updateInput, updateType }: UpdateInputProps) => {
    const [currentValue, setCurrentValue] = useState(initValue?.toString() ?? "0");

    const validateAndMutate = () => {
        if (currentValue.trim() === "") {
            setCurrentValue(initValue?.toString() ?? "0");
            return;
        }

        const parsed = Number(currentValue);
        if (!Number.isFinite(parsed)) {
            setCurrentValue(initValue?.toString() ?? "0");
            return;
        }

        if (parsed === initValue) return;

        if (total !== undefined && total !== null && (parsed > total || parsed < 0)) {
            setCurrentValue(initValue?.toString() ?? "0");
            return;
        }

        updateInput.mutate({ payload: updateType === UpdateType.PAGE
            ? { type: UpdateType.PAGE, currentPage: parsed }
            : { type: UpdateType.CHAPTER, currentChapter: parsed }
        });
    };

    const handleOnBlur = (ev: React.FocusEvent<HTMLInputElement>) => {
        ev.preventDefault();
        validateAndMutate();
    };

    const handleOnKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            ev.currentTarget.blur();
        }
    };

    return (
        <div className="flex items-center w-34 text-sm bg-accent/30 rounded-md border h-8">
            <Input
                inputMode="numeric"
                value={currentValue}
                onBlur={handleOnBlur}
                onKeyDown={handleOnKeyDown}
                disabled={updateInput.isPending}
                onChange={(ev) => setCurrentValue(ev.target.value)}
                className="w-18 h-8 border-none cursor-pointer inline-block dark:bg-transparent"
            />
            <span>{" "}/{" "}{total ?? "?"}</span>
        </div>
    );
};
