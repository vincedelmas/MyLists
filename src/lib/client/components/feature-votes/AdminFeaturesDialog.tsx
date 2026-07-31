import {useId, useState} from "react";
import {Settings2} from "lucide-react";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {FeatureStatus} from "@/lib/utils/enums";
import {zodResolver} from "@hookform/resolvers/zod";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PostFeatureStatus, postFeatureStatusSchema} from "@/lib/schemas";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {useAdminDeleteFeatureMutation, useAdminUpdateFeatureMutation} from "@/lib/client/react-query/query-mutations/feature-votes.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface AdminFeatureDialogProps {
    featureId: number;
    currentStatus: FeatureStatus;
    currentComment: string | null;
}


const featureStatusItems = Object.values(FeatureStatus).map((status) => {
    return { label: status, value: status };
});


export const AdminFeatureControlsDialog = ({ featureId, currentStatus, currentComment }: AdminFeatureDialogProps) => {
    const fieldId = useId();
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
            <DialogTrigger render={<Button variant="outline"/>}>
                <Settings2 className="size-3"/>
                Admin
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Admin Management</DialogTitle>
                    <DialogDescription>
                        Update the status of this feature request and add a public comment.
                    </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleOnSubmit)} className="flex flex-col gap-4">
                        <FieldSet disabled={mutationsPending}>
                            <FieldGroup>
                            <Controller
                                name="status"
                                control={form.control}
                                render={({field, fieldState}) =>
                                    <Field data-invalid={fieldState.invalid} data-disabled={mutationsPending}>
                                        <FieldLabel htmlFor={`${fieldId}-status`}>Feature Status</FieldLabel>
                                        <Select
                                            value={field.value}
                                            items={featureStatusItems}
                                            onValueChange={(value) => {
                                                if (value !== null) field.onChange(value);
                                            }}
                                        >
                                            <SelectTrigger id={`${fieldId}-status`} className="w-full" aria-invalid={fieldState.invalid}>
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {featureStatusItems.map((item) =>
                                                        <SelectItem key={item.value} value={item.value}>
                                                            {item.label}
                                                        </SelectItem>
                                                    )}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                }
                            />
                            <Controller
                                name="adminComment"
                                control={form.control}
                                render={({field, fieldState}) =>
                                    <Field data-invalid={fieldState.invalid} data-disabled={mutationsPending}>
                                        <FieldLabel htmlFor={`${fieldId}-admin-comment`}>Admin Note</FieldLabel>
                                        <Textarea
                                            {...field}
                                            id={`${fieldId}-admin-comment`}
                                            className="min-h-25"
                                            value={field.value ?? ""}
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Provide context on why this status was chosen..."
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                }
                            />
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <DialogFooter>
                            <div className="mr-auto">
                                <Button type="button" variant="destructive" onClick={handleDelete} disabled={mutationsPending}>
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
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
};
