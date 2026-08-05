import {statusUtils} from "@/lib/utils/media-mapping";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface StatusDropProps {
    status: Status;
    mediaType: MediaType;
    completable?: boolean;
    updateStatus: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateStatus = ({ status, mediaType, updateStatus, completable = true }: StatusDropProps) => {
    const allStatuses = statusUtils.byMediaType(mediaType);
    const statusItems = allStatuses?.map((status) => ({ label: status, value: status })) ?? [];

    const handleStatus = (status: Status | null) => {
        if (status === null) return;
        updateStatus.mutate({ payload: { status, type: UpdateType.STATUS } });
    };

    return (
        <div className="flex justify-between items-center">
            <div>Status</div>
            <Select items={statusItems} value={status} onValueChange={handleStatus} disabled={updateStatus.isPending}>
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {statusItems.map((item) =>
                            <SelectItem
                                key={item.value}
                                value={item.value}
                                disabled={item.value === Status.COMPLETED && !completable}
                            >
                                {item.label}
                            </SelectItem>
                        )}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
};
