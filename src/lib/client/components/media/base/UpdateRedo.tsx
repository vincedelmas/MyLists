import {getRedoList} from "@/lib/utils/media-mapping";
import {UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface RedoDropProps {
    name: string;
    redo: number | null;
    updateRedo: ReturnType<typeof useUpdateUserMediaMutation>
}


export const UpdateRedo = ({ name, redo, updateRedo }: RedoDropProps) => {
    const redoItems = getRedoList().map((value) => ({ label: String(value), value: String(value) }));

    const handleRedoChange = (redo: string | null) => {
        if (redo === null) return;
        updateRedo.mutate({ payload: { redo: parseInt(redo), type: UpdateType.REDO } });
    };

    return (
        <div className="flex justify-between items-center">
            <div>{name}</div>
            <Select items={redoItems} value={redo?.toString()} onValueChange={handleRedoChange} disabled={updateRedo?.isPending}>
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {redoItems.map((item) =>
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        )}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
};
