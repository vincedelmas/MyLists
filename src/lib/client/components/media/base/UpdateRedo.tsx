import {getRedoList} from "@/lib/utils/media-mapping";
import {UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface RedoDropProps {
    name: string;
    redo: number | null;
    updateRedo: ReturnType<typeof useUpdateUserMediaMutation>
}


export const UpdateRedo = ({ name, redo, updateRedo }: RedoDropProps) => {
    const handleRedoChange = (redo: string) => {
        updateRedo.mutate({ payload: { redo: parseInt(redo), type: UpdateType.REDO } });
    };

    return (
        <div className="flex justify-between items-center">
            <div>{name}</div>
            <Select value={redo?.toString()} onValueChange={handleRedoChange} disabled={updateRedo?.isPending}>
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    {getRedoList().map(val =>
                        <SelectItem key={val} value={val.toString()}>
                            {`${val}`}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};
