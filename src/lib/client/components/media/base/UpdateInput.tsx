import {UpdateType} from "@/lib/utils/enums";
import {useNumericEdit} from "@/lib/client/components/media/base/use-numeric-edit";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/lib/client/components/ui/input-group";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UpdateInputProps {
    initValue: number | null;
    total: number | null | undefined;
    payloadName: "actualPage" | "currentChapter";
    updateInput: ReturnType<typeof useUpdateUserMediaMutation>;
    updateType: typeof UpdateType.PAGE | typeof UpdateType.CHAPTER;
}


export const UpdateInput = ({ total, initValue, updateInput, payloadName, updateType }: UpdateInputProps) => {
    const input = useNumericEdit({
        value: initValue ?? 0,
        validate: (value) => {
            return Number.isInteger(value) && value >= 0 && (total === undefined || total === null || value <= total);
        },
        onCommit: async (value) => {
            return Boolean(await updateInput.mutateAsync({ payload: { type: updateType, [payloadName]: value } }));
        },
    });

    return (
        <MediaSaveFeedback mutation={updateInput} field={payloadName}>
            {saveDisabled => (
                <InputGroup className="w-34 h-7 rounded-md">
                    <InputGroupInput
                        {...input}
                        inputMode="numeric"
                        disabled={saveDisabled}
                        aria-label={payloadName === "actualPage" ? "Current page" : "Current chapter"}
                    />
                    <InputGroupAddon align="inline-end">
                        {" "}/{" "}{total ?? "?"}
                    </InputGroupAddon>
                </InputGroup>
            )}
        </MediaSaveFeedback>
    );
};
