import {statusUtils} from "@/lib/utils/media-mapping";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface StatusDropProps {
    status: Status;
    mediaType: MediaType;
    completable?: boolean;
    updateStatus: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateStatus = ({ status, mediaType, updateStatus, completable = true }: StatusDropProps) => {
    const allStatuses = statusUtils.byMediaType(mediaType);

    const handleStatus = (status: Status) => {
        updateStatus.mutate({ payload: { status, type: UpdateType.STATUS } });
    };

    return (
        <div className="flex justify-between items-center">
            <div>Status</div>
            <Select value={status} onValueChange={handleStatus} disabled={updateStatus.isPending}>
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    {allStatuses?.map((s) =>
                        <SelectItem key={s} value={s} disabled={s === Status.COMPLETED && !completable}>
                            {s}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};
