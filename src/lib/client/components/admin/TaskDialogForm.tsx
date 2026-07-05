import {z} from "zod";
import {toast} from "sonner";
import {useState} from "react";
import {Loader2, Settings2} from "lucide-react";
import {Control, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {FormError} from "@/lib/client/components/forms/FormError";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {TaskFormValues, TaskInputProperty, TaskMetadata} from "@/lib/types/tasks.types";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
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
                toast.info(`Task ${task.name} Finished`);
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
            <DialogTrigger asChild>
                <Button size="sm" disabled={triggerTaskMutation.isPending}>
                    {triggerTaskMutation.isPending ? <Loader2 className="size-4 animate-spin"/> : <Settings2 className="size-4"/>}
                    {triggerTaskMutation.isPending ? "Running" : "Configure"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <fieldset disabled={triggerTaskMutation.isPending} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>{task.name}</DialogTitle>
                                <DialogDescription>{task.description}</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {Object.entries(task.inputSchema.properties).map(([name, property]) =>
                                    <TaskFormField
                                        key={name}
                                        name={name}
                                        property={property}
                                        control={form.control}
                                        required={requiredFields.has(name)}
                                    />
                                )}
                            </div>
                        </fieldset>
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
                </Form>
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
    const type = property.type ?? "string";
    const enumValues = property.enum?.filter((value): value is string => typeof value === "string");
    const arrayEnumValues = type === "array" && property.items && !Array.isArray(property.items)
        ? property.items.enum?.filter((value): value is string => typeof value === "string")
        : undefined;

    return (
        <FormField
            name={name}
            control={control}
            render={({ field }) => {
                if (enumValues?.length) {
                    return (
                        <FormItem>
                            <TaskFormLabel name={name} required={required}/>
                            <Select value={String(field.value ?? "")} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={`Select ${name.toLowerCase()}`}/>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {enumValues.map((option) =>
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <TaskFormDescription
                                description={property.description}
                            />
                            <FormMessage/>
                        </FormItem>
                    );
                }

                if (type === "boolean") {
                    return (
                        <FormItem className="flex items-start gap-2 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={Boolean(field.value)}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="grid gap-1.5 leading-none">
                                <TaskFormLabel
                                    name={name}
                                    required={required}
                                />
                                <TaskFormDescription
                                    description={property.description}
                                />
                                <FormMessage/>
                            </div>
                        </FormItem>
                    );
                }

                if (type === "number" || type === "integer") {
                    return (
                        <FormItem>
                            <TaskFormLabel name={name} required={required}/>
                            <FormControl>
                                <Input
                                    type="number"
                                    ref={field.ref}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    min={property.minimum}
                                    max={property.maximum}
                                    value={field.value ?? ""}
                                    step={property.multipleOf ?? (type === "integer" ? 1 : undefined)}
                                    onChange={ev => field.onChange(ev.target.value === "" ? undefined : ev.target.valueAsNumber)}
                                />
                            </FormControl>
                            <TaskFormDescription
                                description={property.description}
                            />
                            <FormMessage/>
                        </FormItem>
                    );
                }

                if (type === "array") {
                    const arrayValue = Array.isArray(field.value) ? field.value : [];

                    if (arrayEnumValues?.length) {
                        return (
                            <FormItem>
                                <TaskFormLabel name={name} required={required}/>
                                <FormControl>
                                    <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                        {arrayEnumValues.map((option) =>
                                            <label key={option} className="flex items-center gap-2 text-sm capitalize">
                                                <Checkbox
                                                    checked={arrayValue.includes(option)}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked
                                                            ? [...arrayValue, option]
                                                            : arrayValue.filter((value) => value !== option)
                                                        );
                                                    }}
                                                />
                                                {option}
                                            </label>
                                        )}
                                    </div>
                                </FormControl>
                                <TaskFormDescription
                                    description={property.description}
                                />
                                <FormMessage/>
                            </FormItem>
                        );
                    }

                    return (
                        <FormItem>
                            <TaskFormLabel name={name} required={required}/>
                            <FormControl>
                                <Input
                                    type="text"
                                    ref={field.ref}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    placeholder="Comma-separated values"
                                    value={arrayValue.join(", ")}
                                    onChange={(ev) => {
                                        const value = ev.target.value.trim();
                                        field.onChange(value ? value.split(",").map((item) => item.trim()) : []);
                                    }}
                                />
                            </FormControl>
                            <TaskFormDescription
                                description={property.description}
                            />
                            <FormMessage/>
                        </FormItem>
                    );
                }

                return (
                    <FormItem>
                        <TaskFormLabel name={name} required={required}/>
                        <FormControl>
                            <Input
                                {...field}
                                value={field.value ?? ""}
                                minLength={property.minLength}
                                maxLength={property.maxLength}
                                type={property.format === "email" ? "email" : "text"}
                            />
                        </FormControl>
                        <TaskFormDescription
                            description={property.description}
                        />
                        <FormMessage/>
                    </FormItem>
                );
            }}
        />
    );
}


function TaskFormLabel({ name, required }: { name: string; required: boolean }) {
    return (
        <FormLabel>
            {formatFieldName(name)}
            {required &&
                <span className="text-destructive ml-1">*</span>
            }
        </FormLabel>
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
        <FormDescription className="text-xs">
            {description}
        </FormDescription>
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
