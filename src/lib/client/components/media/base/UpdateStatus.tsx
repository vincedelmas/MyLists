import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface StatusDropProps {
    status: Status;
    mediaType: MediaType;
    updateStatus: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateStatus = ({ status, mediaType, updateStatus }: StatusDropProps) => {
    const allStatuses = getMediaDefinition(mediaType).statuses;
    const statusItems = allStatuses?.map((status) => ({ label: status, value: status })) ?? [];

    const handleStatus = (status: Status | null) => {
        if (status === null) return;
        updateStatus.mutate({ payload: { status, type: UpdateType.STATUS } });
    };

    return (
        <div className="flex justify-between items-center">
            <div>Status</div>
            <MediaSaveFeedback mutation={updateStatus} field="status">
                {saveDisabled => (
                    <Select items={statusItems} value={status} onValueChange={handleStatus} disabled={saveDisabled}>
                        <SelectTrigger size="sm" className="w-34">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {statusItems.map((item) =>
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                )}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                )}
            </MediaSaveFeedback>
        </div>
    );
};
