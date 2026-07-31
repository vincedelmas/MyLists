import {z} from "zod";
import {toast} from "@/lib/client/components/ui/toast";
import {useId, useState} from "react";
import {Loader2, Settings2} from "lucide-react";
import {Controller, type Control, FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {TaskFormValues, TaskInputProperty, TaskMetadata} from "@/lib/types/tasks.types";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


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
                toast.add({title: `Task ${task.name} Finished`, type: "info"});
            },
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            triggerTaskMutation.reset();
            form.reset(getDefaultValues(task.inputSchema));
        }
        setOpen(newOpen);
    };

    const requiredFields = new Set(task.inputSchema.required ?? []);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size="sm" disabled={triggerTaskMutation.isPending}/>}>
                {triggerTaskMutation.isPending ? <Loader2 className="size-4 animate-spin"/> : <Settings2 className="size-4"/>}
                {triggerTaskMutation.isPending ? "Running" : "Configure"}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                        <DialogHeader>
                            <DialogTitle>{task.name}</DialogTitle>
                            <DialogDescription>{task.description}</DialogDescription>
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
                                Run Task
                            </FormSubmitButton>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}


interface TaskFormFieldProps {
    name: string;
    required: boolean;
    property: TaskInputProperty;
    control: Control<TaskFormValues>;
}


function TaskFormField({ name, property, required, control }: TaskFormFieldProps) {
    const fieldId = useId();
    const type = property.type ?? "string";
    const enumValues = property.enum?.filter((value): value is string => typeof value === "string");
    const enumItems = enumValues?.map((value) => ({ label: value, value })) ?? [];
    const arrayEnumValues = type === "array" && property.items && !Array.isArray(property.items)
        ? property.items.enum?.filter((value): value is string => typeof value === "string")
        : undefined;

    return (
        <Controller
            name={name}
            control={control}
            render={({field, fieldState}) => {
                if (enumValues?.length) {
                    return (
                        <Field data-invalid={fieldState.invalid}>
                            <TaskFormLabel id={fieldId} name={name} required={required}/>
                            <Select
                                items={enumItems}
                                value={String(field.value ?? "")}
                                onValueChange={(value) => {
                                    if (value !== null) field.onChange(value);
                                }}
                            >
                                <SelectTrigger id={fieldId} className="w-full" aria-invalid={fieldState.invalid}>
                                    <SelectValue placeholder={`Select ${name.toLowerCase()}`}/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {enumItems.map((item) =>
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <TaskFormDescription
                                description={property.description}
                            />
                            <FieldError errors={[fieldState.error]}/>
                        </Field>
                    );
                }

                if (type === "boolean") {
                    return (
                        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                            <Checkbox
                                id={fieldId}
                                checked={Boolean(field.value)}
                                aria-invalid={fieldState.invalid}
                                onCheckedChange={field.onChange}
                            />
                            <FieldContent>
                                <TaskFormLabel
                                    id={fieldId}
                                    name={name}
                                    required={required}
                                />
                                <TaskFormDescription
                                    description={property.description}
                                />
                                <FieldError errors={[fieldState.error]}/>
                            </FieldContent>
                        </Field>
                    );
                }

                if (type === "number" || type === "integer") {
                    return (
                        <Field data-invalid={fieldState.invalid}>
                            <TaskFormLabel id={fieldId} name={name} required={required}/>
                            <Input
                                id={fieldId}
                                type="number"
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                min={property.minimum}
                                max={property.maximum}
                                value={field.value ?? ""}
                                aria-invalid={fieldState.invalid}
                                step={property.multipleOf ?? (type === "integer" ? 1 : undefined)}
                                onChange={ev => field.onChange(ev.target.value === "" ? undefined : ev.target.valueAsNumber)}
                            />
                            <TaskFormDescription
                                description={property.description}
                            />
                            <FieldError errors={[fieldState.error]}/>
                        </Field>
                    );
                }

                if (type === "array") {
                    const arrayValue = Array.isArray(field.value) ? field.value : [];

                    if (arrayEnumValues?.length) {
                        return (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldSet>
                                    <FieldLegend variant="label">
                                        {formatFieldName(name)}
                                        {required && <span className="ml-1 text-destructive">*</span>}
                                    </FieldLegend>
                                    <FieldGroup data-slot="checkbox-group" className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                        {arrayEnumValues.map((option, index) =>
                                            <Field key={option} orientation="horizontal">
                                                <Checkbox
                                                    id={`${fieldId}-option-${index}`}
                                                    checked={arrayValue.includes(option)}
                                                    aria-invalid={fieldState.invalid}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked
                                                            ? [...arrayValue, option]
                                                            : arrayValue.filter((value) => value !== option)
                                                        );
                                                    }}
                                                />
                                                <FieldLabel htmlFor={`${fieldId}-option-${index}`} className="font-normal capitalize">
                                                    {option}
                                                </FieldLabel>
                                            </Field>
                                        )}
                                    </FieldGroup>
                                </FieldSet>
                                <TaskFormDescription
                                    description={property.description}
                                />
                                <FieldError errors={[fieldState.error]}/>
                            </Field>
                        );
                    }

                    return (
                        <Field data-invalid={fieldState.invalid}>
                            <TaskFormLabel id={fieldId} name={name} required={required}/>
                            <Input
                                id={fieldId}
                                type="text"
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                placeholder="Comma-separated values"
                                value={arrayValue.join(", ")}
                                aria-invalid={fieldState.invalid}
                                onChange={(ev) => {
                                    const value = ev.target.value.trim();
                                    field.onChange(value ? value.split(",").map((item) => item.trim()) : []);
                                }}
                            />
                            <TaskFormDescription
                                description={property.description}
                            />
                            <FieldError errors={[fieldState.error]}/>
                        </Field>
                    );
                }

                return (
                    <Field data-invalid={fieldState.invalid}>
                        <TaskFormLabel id={fieldId} name={name} required={required}/>
                        <Input
                            {...field}
                            id={fieldId}
                            value={field.value ?? ""}
                            minLength={property.minLength}
                            maxLength={property.maxLength}
                            aria-invalid={fieldState.invalid}
                            type={property.format === "email" ? "email" : "text"}
                        />
                        <TaskFormDescription
                            description={property.description}
                        />
                        <FieldError errors={[fieldState.error]}/>
                    </Field>
                );
            }}
        />
    );
}


function TaskFormLabel({ id, name, required }: { id: string; name: string; required: boolean }) {
    return (
        <FieldLabel htmlFor={id}>
            {formatFieldName(name)}
            {required &&
                <span className="text-destructive ml-1">*</span>
            }
        </FieldLabel>
    );
}


function formatFieldName(name: string) {
    const label = name
        .replaceAll("_", " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2");

    return label.charAt(0).toUpperCase() + label.slice(1);
}


function TaskFormDescription({ description }: { description?: string }) {
    if (!description) return null;
    return (
        <FieldDescription className="text-xs">
            {description}
        </FieldDescription>
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
