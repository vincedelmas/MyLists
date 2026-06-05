import {toast} from "sonner";
import {SubmitEvent, useState} from "react";
import {TaskMetadata} from "@/lib/types/tasks.types";
import {Loader2, Play, Settings2} from "lucide-react";
import {Label} from "@/lib/client/components/ui/label";
import {FormZodError} from "@/lib/utils/error-classes";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface TaskFormDialogProps {
    isRunning: boolean;
    task: TaskMetadata;
    mutation: ReturnType<typeof useAdminTriggerTaskMutation>;
}


export function TaskFormDialog({ task, isRunning, mutation }: TaskFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [errors, setErrors] = useState<{ field: string, message: string }[] | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>(() => getDefaultValues(task.inputSchema!));

    const handleSubmit = (ev: SubmitEvent) => {
        ev.preventDefault();

        setErrors(null);

        mutation.mutate({ data: { taskName: task.name, input: formData } }, {
            onError: (err) => {
                if (err instanceof FormZodError) {
                    err.issues.forEach((issue) => {
                        setErrors((prev) => [
                            ...(prev || []), { field: issue.path?.[1] ?? issue.path[0], message: issue.message },
                        ]);
                    });
                }
            },
            onSuccess: () => {
                setOpen(false);
                setErrors(null);
                toast.info(`Task ${task.name} Finished`);
            },
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setFormData(getDefaultValues(task.inputSchema!));
        }
        setOpen(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={isRunning}>
                    {isRunning ? <Loader2 className="size-4 animate-spin"/> : <Settings2 className="size-4"/>}
                    {isRunning ? "Running" : "Configure"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{task.name}</DialogTitle>
                        <DialogDescription>{task.description}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {Object.entries(task.inputSchema!.properties).map(([key, prop]) =>
                            <TaskFormField
                                key={key}
                                name={key}
                                property={prop}
                                value={formData[key]}
                                isRunning={isRunning}
                                onChange={(value) => setFormData((prev) => ({ ...prev, [key]: value }))}
                            />
                        )}
                    </div>
                    {errors && errors.map((error, idx) =>
                        <p key={idx} className="text-destructive text-sm">
                            {error.field}: {error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isRunning}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isRunning}>
                            {isRunning ? <Loader2 className="size-4 animate-spin"/> : <Play className="size-4"/>}
                            Run Task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


interface TaskFormFieldProps {
    value: any;
    name: string;
    isRunning: boolean;
    onChange: (value: any) => void;
    property: TaskMetadata["inputSchema"]["properties"][string];
}


function TaskFormField({ name, property, value, onChange, isRunning }: TaskFormFieldProps) {
    const { type, description, required } = property;

    if (property.enum && property.enum.length > 0) {
        return (
            <div className="grid gap-2">
                <Label htmlFor={name}>
                    {name}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {description &&
                    <p className="text-muted-foreground text-xs">
                        {description}
                    </p>
                }
                <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
                    <SelectTrigger id={name} disabled={isRunning}>
                        <SelectValue placeholder={`Select ${name.toLowerCase()}`}/>
                    </SelectTrigger>
                    <SelectContent>
                        {property.enum.map((option) =>
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    if (type === "boolean") {
        return (
            <div className="flex items-center space-x-2">
                <Checkbox
                    id={name}
                    disabled={isRunning}
                    checked={Boolean(value)}
                    onCheckedChange={(checked) => onChange(checked)}
                />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={name} className="cursor-pointer">
                        {name}
                    </Label>
                    {description &&
                        <p className="text-muted-foreground text-xs">
                            {description}
                        </p>
                    }
                </div>
            </div>
        );
    }

    if (type === "number" || type === "integer") {
        return (
            <div className="grid gap-2">
                <Label htmlFor={name}>
                    {name}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {description &&
                    <p className="text-muted-foreground text-xs">
                        {description}
                    </p>
                }
                <Input
                    id={name}
                    type="number"
                    required={required}
                    disabled={isRunning}
                    value={value === undefined ? "" : String(value)}
                    onChange={(ev) => {
                        const val = ev.target.value;
                        onChange(val === "" ? undefined : Number(val));
                    }}
                />
            </div>
        );
    }

    if (type === "array") {
        const arrayValue = Array.isArray(value) ? value : [];
        return (
            <div className="grid gap-2">
                <Label htmlFor={name}>
                    {name}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {description &&
                    <p className="text-muted-foreground text-xs">{description}</p>
                }
                <Input
                    id={name}
                    type="text"
                    disabled={isRunning}
                    placeholder="Comma-separated values"
                    value={arrayValue.join(", ")}
                    onChange={(ev) => {
                        const val = ev.target.value;
                        if (val.trim() === "") onChange([]);
                        else onChange(val.split(",").map((s) => s.trim()));
                    }}
                />
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>
                {name}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {description &&
                <p className="text-muted-foreground text-xs">
                    {description}
                </p>
            }
            <Input
                id={name}
                type="text"
                required={required}
                disabled={isRunning}
                value={String(value ?? "")}
                onChange={(ev) => onChange(ev.target.value)}
            />
        </div>
    );
}


function getDefaultValues(inputSchema: TaskMetadata["inputSchema"]) {
    const defaults: Record<string, any> = {};

    for (const [key, prop] of Object.entries(inputSchema.properties)) {
        if (prop.default !== undefined) {
            defaults[key] = prop.default;
        }
        else if (prop.type === "boolean") {
            defaults[key] = false;
        }
        else if (prop.type === "number") {
            defaults[key] = 0;
        }
        else {
            defaults[key] = "";
        }
    }

    return defaults;
}
