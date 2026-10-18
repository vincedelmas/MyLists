import {z} from "zod";
import {useState} from "react";
import {Settings2} from "lucide-react";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {Button} from "@/lib/client/components/ui/button";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import type {TaskFormValues, TaskMetadata} from "@/lib/types/tasks.types";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {TaskFormField} from "@/lib/client/components/admin/tasks/TaskFormField";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {formatTaskLabel} from "@/lib/client/components/admin/tasks/task-form.utils";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface TaskFormDialogProps {
    task: TaskMetadata;
}


export function TaskFormDialog({ task }: TaskFormDialogProps) {
    const [open, setOpen] = useState(false);
    const triggerTaskMutation = useAdminTriggerTaskMutation({ noErrorToast: true });
    const taskSchema = z.fromJSONSchema(task.inputSchema as z.core.JSONSchema.JSONSchema) as z.ZodType<TaskFormValues, TaskFormValues>;

    const form = useForm<TaskFormValues, unknown, TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: getDefaultValues(task.inputSchema),
    });

    const handleSubmit = (formData: TaskFormValues) => {
        triggerTaskMutation.mutate({ data: { taskName: task.name, input: formData } }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => {
                setOpen(false);
            },
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (triggerTaskMutation.isPending) return;
        if (newOpen) {
            triggerTaskMutation.reset();
            form.reset(getDefaultValues(task.inputSchema));
        }
        setOpen(newOpen);
    };

    const requiredFields = new Set(task.inputSchema.required ?? []);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <LoadingButton
                        icon={<Settings2 data-icon="inline-start"/>}
                        size="sm" isLoading={triggerTaskMutation.isPending}
                        aria-label={`Configure ${formatTaskLabel(task.name)}`}
                    />
                }
            >
                {triggerTaskMutation.isPending ? "Running" : "Configure"}
            </DialogTrigger>

            <DialogContent
                showCloseButton={!triggerTaskMutation.isPending}
                className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
            >
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                        <DialogHeader>
                            <DialogTitle>
                                {formatTaskLabel(task.name)}
                            </DialogTitle>
                            <DialogDescription>
                                {task.description}
                            </DialogDescription>
                        </DialogHeader>
                        <FieldSet disabled={triggerTaskMutation.isPending}>
                            <FieldGroup className="py-4">
                                {Object.entries(task.inputSchema.properties).map(([name, property]) =>
                                    <TaskFormField
                                        key={name}
                                        name={name}
                                        property={property}
                                        control={form.control}
                                        required={requiredFields.has(name)}
                                    />
                                )}
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={triggerTaskMutation.isPending}
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <FormSubmitButton isLoading={triggerTaskMutation.isPending}>
                                Run task
                            </FormSubmitButton>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}


function getDefaultValues(inputSchema: TaskMetadata["inputSchema"]) {
    const defaults: TaskFormValues = {};

    for (const [key, property] of Object.entries(inputSchema.properties)) {
        if (property.default !== undefined) {
            defaults[key] = property.default;
        }
        else if (property.type === "boolean") {
            defaults[key] = false;
        }
        else if (property.type === "array") {
            defaults[key] = [];
        }
        else {
            defaults[key] = undefined;
        }
    }

    return defaults;
}
