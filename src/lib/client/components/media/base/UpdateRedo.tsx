import {UpdateType} from "@/lib/utils/enums";
import {KeyboardEvent, useState} from "react";
import {REDO_MAX} from "@/lib/utils/constants";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface RedoInputProps {
    name: string;
    redo: number | null;
    updateRedo: ReturnType<typeof useUpdateUserMediaMutation>
}


export const UpdateRedo = ({ name, redo, updateRedo }: RedoInputProps) => {
    const savedRedo = redo ?? 0;
    const [currentValue, setCurrentValue] = useState(savedRedo.toString());

    const validateAndMutate = () => {
        const parsedValue = Number(currentValue);

        if (parsedValue > REDO_MAX) {
            setCurrentValue(savedRedo.toString());
            toast.add({ description: `Max ${name} is fixed to ${REDO_MAX}.`, type: "warning" });
            return;
        }

        if (currentValue.trim() === "" || !Number.isInteger(parsedValue) || parsedValue < 0) {
            setCurrentValue(savedRedo.toString());
            return;
        }

        if (parsedValue === savedRedo) return;

        updateRedo.mutate({ payload: { redo: parsedValue, type: UpdateType.REDO } });
    };

    const handleOnKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            ev.currentTarget.blur();
        }
    };

    return (
        <div className="flex justify-between items-center">
            <div>{name}</div>
            <Input
                min={0}
                step={1}
                type="number"
                max={REDO_MAX}
                className="w-34"
                inputMode="numeric"
                value={currentValue}
                onBlur={validateAndMutate}
                onKeyDown={handleOnKeyDown}
                aria-label={`${name} count`}
                disabled={updateRedo.isPending}
                onChange={(ev) => setCurrentValue(ev.target.value)}
            />
        </div>
    );
};
