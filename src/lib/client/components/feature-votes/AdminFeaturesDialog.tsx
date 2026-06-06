import {useState} from "react";
import {Settings2} from "lucide-react";
import {FeatureStatus} from "@/lib/utils/enums";
import {Label} from "@/lib/client/components/ui/label";
import {Button} from "@/lib/client/components/ui/button";
import {displayContainerError} from "@/lib/utils/error-display";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {useAdminDeleteFeatureRequestMutation, useAdminUpdateFeatureStatusMutation} from "@/lib/client/react-query/query-mutations/feature-votes.mutations";


interface AdminFeatureDialogProps {
    featureId: number;
    currentStatus: FeatureStatus;
    currentComment: string | null;
}


export const AdminFeatureControlsDialog = ({ featureId, currentStatus, currentComment }: AdminFeatureDialogProps) => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState(currentComment ?? "");
    const [status, setStatus] = useState<FeatureStatus>(currentStatus);
    const updateStatusMutation = useAdminUpdateFeatureStatusMutation({ noGlobalErrorToast: true });
    const deleteFeatureMutation = useAdminDeleteFeatureRequestMutation({ noGlobalErrorToast: true });

    const handleSave = () => {
        updateStatusMutation.mutate({ data: { featureId, status, adminComment: note } }, {
            onSuccess: () => setOpen(false),
        });
    };

    const handleDelete = () => {
        if (!window.confirm("Delete this feature request and all its votes?")) return;

        deleteFeatureMutation.mutate({ data: { featureId } }, {
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="size-3"/>
                    Admin
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Admin Management</DialogTitle>
                    <DialogDescription>
                        Update the status of this feature request and add internal or public
                        commentary.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium leading-none">
                            Feature Status
                        </Label>
                        <Select
                            value={status}
                            disabled={updateStatusMutation.isPending}
                            onValueChange={(v) => setStatus(v as FeatureStatus)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(FeatureStatus).map((fs) =>
                                    <SelectItem key={fs} value={fs}>
                                        {fs}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium leading-none">
                            Admin Note
                        </Label>
                        <Textarea
                            rows={4}
                            value={note}
                            disabled={updateStatusMutation.isPending}
                            onChange={(ev) => setNote(ev.target.value)}
                            placeholder="Provide context on why this status was chosen..."
                        />
                    </div>
                </div>

                {(deleteFeatureMutation.isError || updateStatusMutation.isError) &&
                    <InlineErrorContainer>
                        {displayContainerError({ error: deleteFeatureMutation.error ?? updateStatusMutation.error })}
                    </InlineErrorContainer>
                }

                <DialogFooter>
                    <div className="mr-auto">
                        <Button
                            size="sm"
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteFeatureMutation.isPending}
                        >
                            Delete Request
                        </Button>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={updateStatusMutation.isPending || deleteFeatureMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={updateStatusMutation.isPending || deleteFeatureMutation.isPending}
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
