import {UpdateType} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {useNumericEdit} from "@/lib/client/components/media/base/use-numeric-edit";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface RedoInputProps {
    name: string;
    redo: number | null;
    updateRedo: ReturnType<typeof useUpdateUserMediaMutation>
}


export const UpdateRedo = ({ name, redo, updateRedo }: RedoInputProps) => {
    const input = useNumericEdit({
        value: redo ?? 0,
        validate: (value) => {
            if (value > REDO_MAX) {
                toast.add({ description: `Max ${name} is fixed to ${REDO_MAX}.`, type: "warning" });
                return false;
            }
            return Number.isInteger(value) && value >= 0;
        },
        onCommit: async (value) => {
            return Boolean(await updateRedo.mutateAsync({ payload: { redo: value, type: UpdateType.REDO } }));
        },
    });

    return (
        <div className="flex justify-between items-center">
            <div>{name}</div>
            <MediaSaveFeedback mutation={updateRedo} field="redo">
                {saveDisabled => (
                    <Input
                        {...input}
                        min={0}
                        step={1}
                        type="number"
                        max={REDO_MAX}
                        inputMode="numeric"
                        disabled={saveDisabled}
                        aria-label={`${name} count`}
                        className="w-34 h-7 rounded-md"
                    />
                )}
            </MediaSaveFeedback>
        </div>
    );
};
