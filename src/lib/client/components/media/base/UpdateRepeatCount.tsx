import {getRedoList} from "@/lib/utils/media-mapping";
import {UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface UpdateRepeatCountProps {
    name: string;
    count: number;
    family: "movie" | "reading";
    mutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateRepeatCount = ({ name, count, family, mutation }: UpdateRepeatCountProps) => {
    const handleChange = (value: string) => {
        const nextCount = Number.parseInt(value);
        mutation.mutate({ payload: family === "movie"
            ? { rewatchCount: nextCount, type: UpdateType.REDO }
            : { rereadCount: nextCount, type: UpdateType.REDO }
        });
    };

    return (
        <div className="flex justify-between items-center">
            <div>{name}</div>
            <Select value={count.toString()} onValueChange={handleChange} disabled={mutation.isPending}>
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    {getRedoList().map((value) =>
                        <SelectItem key={value} value={value.toString()}>
                            {value}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};
