import {useId} from "react";
import {Input} from "@/lib/client/components/ui/input";
import {type Control, Controller} from "react-hook-form";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import type {TaskFormValues, TaskInputProperty} from "@/lib/types/tasks.types";
import {formatTaskLabel} from "@/lib/client/components/admin/tasks/task-form.utils";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


interface TaskFormFieldProps {
    name: string;
    required: boolean;
    property: TaskInputProperty;
    control: Control<TaskFormValues>;
}


export function TaskFormField({ name, property, required, control }: TaskFormFieldProps) {
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
            render={({ field, fieldState }) => {
                if (enumValues?.length) {
                    return (
                        <Field data-invalid={fieldState.invalid}>
                            <TaskFormLabel
                                id={fieldId}
                                name={name}
                                required={required}
                            />
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
                            <FieldError
                                errors={[fieldState.error]}
                            />
                        </Field>
                    );
                }

                if (type === "boolean") {
                    return (
                        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                            <Checkbox
                                id={fieldId}
                                checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                                aria-invalid={fieldState.invalid}
                            />
                            <FieldContent>
                                <TaskFormLabel
                                    name={name}
                                    id={fieldId}
                                    required={required}
                                />
                                <TaskFormDescription
                                    description={property.description}
                                />
                                <FieldError
                                    errors={[fieldState.error]}
                                />
                            </FieldContent>
                        </Field>
                    );
                }

                if (type === "number" || type === "integer") {
                    return (
                        <Field data-invalid={fieldState.invalid}>
                            <TaskFormLabel
                                name={name}
                                id={fieldId}
                                required={required}
                            />
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
                            <FieldError
                                errors={[fieldState.error]}
                            />
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
                                        {formatTaskLabel(name)}
                                        {required &&
                                            <span className="ml-1 text-destructive">
                                                *
                                            </span>
                                        }
                                    </FieldLegend>
                                    <FieldGroup data-slot="checkbox-group" className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                        {arrayEnumValues.map((option, index) =>
                                            <Field key={option} orientation="horizontal">
                                                <Checkbox
                                                    id={`${fieldId}-option-${index}`}
                                                    aria-invalid={fieldState.invalid}
                                                    checked={arrayValue.includes(option)}
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
                                <FieldError
                                    errors={[fieldState.error]}
                                />
                            </Field>
                        );
                    }

                    return (
                        <Field data-invalid={fieldState.invalid}>
                            <TaskFormLabel id={fieldId} name={name} required={required}/>
                            <Input
                                type="text"
                                id={fieldId}
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                aria-invalid={fieldState.invalid}
                                placeholder="Comma-separated values"
                                value={arrayValue.join(", ")}
                                onChange={(ev) => {
                                    const value = ev.target.value.trim();
                                    field.onChange(value ? value.split(",").map((item) => item.trim()) : []);
                                }}
                            />
                            <TaskFormDescription
                                description={property.description}
                            />
                            <FieldError
                                errors={[fieldState.error]}
                            />
                        </Field>
                    );
                }

                return (
                    <Field data-invalid={fieldState.invalid}>
                        <TaskFormLabel
                            name={name}
                            id={fieldId}
                            required={required}
                        />
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
                        <FieldError
                            errors={[fieldState.error]}
                        />
                    </Field>
                );
            }}
        />
    );
}


function TaskFormLabel({ id, name, required }: { id: string; name: string; required: boolean }) {
    return (
        <FieldLabel htmlFor={id}>
            {formatTaskLabel(name)}
            {required &&
                <span className="text-destructive ml-1">
                    *
                </span>
            }
        </FieldLabel>
    );
}


function TaskFormDescription({ description }: { description?: string }) {
    if (!description) return null;

    return (
        <FieldDescription className="text-xs">
            {description}
        </FieldDescription>
    );
}
