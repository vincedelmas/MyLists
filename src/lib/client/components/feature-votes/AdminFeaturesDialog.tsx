import {useState} from "react";
import {Settings2} from "lucide-react";
import {useForm} from "react-hook-form";
import {FeatureStatus} from "@/lib/utils/enums";
import {zodResolver} from "@hookform/resolvers/zod";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PostFeatureStatus, postFeatureStatusSchema} from "@/lib/schemas";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {useAdminDeleteFeatureMutation, useAdminUpdateFeatureMutation} from "@/lib/client/react-query/query-mutations/feature-votes.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


interface AdminFeatureDialogProps {
    featureId: number;
    currentStatus: FeatureStatus;
    currentComment: string | null;
}


export const AdminFeatureControlsDialog = ({ featureId, currentStatus, currentComment }: AdminFeatureDialogProps) => {
    const confirm = useConfirm();
    const [open, setOpen] = useState(false);
    const updateStatusMutation = useAdminUpdateFeatureMutation({ noErrorToast: true });
    const deleteFeatureMutation = useAdminDeleteFeatureMutation({ noErrorToast: true });
    const form = useForm<PostFeatureStatus>({
        resolver: zodResolver(postFeatureStatusSchema),
        defaultValues: {
            featureId: featureId,
            status: currentStatus,
            adminComment: currentComment ?? "",
        },
    });

    const mutationsPending = updateStatusMutation.isPending || deleteFeatureMutation.isPending;

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            updateStatusMutation.reset();
            deleteFeatureMutation.reset();
            form.reset({
                featureId,
                status: currentStatus,
                adminComment: currentComment ?? "",
            });
        }
    };

    const handleOnSubmit = (submitted: PostFeatureStatus) => {
        updateStatusMutation.mutate({ data: submitted }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => setOpen(false),
        });
    };

    const handleDelete = async () => {
        if (!await confirm({
            variant: "destructive",
            confirmLabel: "Delete request",
            title: "Delete this feature request?",
            description: "The request and all of its votes will be permanently deleted.",
        })) return;

        deleteFeatureMutation.mutate({ data: { featureId } }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings2 className="size-3"/>
                    Admin
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Admin Management</DialogTitle>
                    <DialogDescription>
                        Update the status of this feature request and add a public comment.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleOnSubmit)} className="space-y-4">
                        <fieldset className="space-y-4" disabled={mutationsPending}>
                            <FormField
                                name="status"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Feature Status</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.values(FeatureStatus).map((fs) =>
                                                    <SelectItem key={fs} value={fs}>
                                                        {fs}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                            <FormField
                                name="adminComment"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Admin Note</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="min-h-25"
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                placeholder="Provide context on why this status was chosen..."
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                        </fieldset>
                        <FormError/>
                        <DialogFooter>
                            <div className="mr-auto">
                                <Button size="sm" type="button" variant="destructive" onClick={handleDelete} disabled={mutationsPending}>
                                    Delete Request
                                </Button>
                            </div>
                            <Button type="button" variant="ghost" disabled={mutationsPending} onClick={() => handleOpenChange(false)}>
                                Cancel
                            </Button>
                            <FormSubmitButton
                                disabled={deleteFeatureMutation.isPending}
                                isLoading={updateStatusMutation.isPending}
                            >
                                Save Changes
                            </FormSubmitButton>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
