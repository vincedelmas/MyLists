import {useId, useState} from "react";
import {ChevronDown, ChevronUp} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


interface MediaFilterCheckboxProps {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}


export const MediaFilterCheckbox = ({ label, checked, disabled, onChange }: MediaFilterCheckboxProps) => {
    const fieldId = useId();

    return (
        <Field orientation="horizontal" data-disabled={disabled}>
            <Checkbox
                id={fieldId}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onChange}
            />
            <FieldLabel htmlFor={fieldId} className="line-clamp-1 cursor-pointer font-normal">
                {label}
            </FieldLabel>
        </Field>
    );
};


interface MediaFilterCheckboxGroupProps<T extends string> {
    title: string;
    items: readonly T[];
    selected: readonly T[];
    disabled?: boolean;
    error?: string;
    maxSelected?: number;
    onChange: (selected: T[]) => void;
    renderLabel?: (value: T) => string;
}


export const MediaFilterCheckboxGroup = <T extends string, >({ title, items, selected, maxSelected, disabled, error, renderLabel, onChange }: MediaFilterCheckboxGroupProps<T>) => {
    const errorId = useId();
    const initialVisibleItems = 14;
    const [showAll, setShowAll] = useState(false);
    const visibleItems = showAll ? items : items.slice(0, initialVisibleItems);

    return (
        <FieldSet disabled={disabled} data-invalid={!!error} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}>
            <FieldLegend variant="label">
                {title}
            </FieldLegend>

            {maxSelected !== undefined && items.length > maxSelected &&
                <FieldDescription>
                    Choose up to {maxSelected} {title.toLowerCase()}.
                </FieldDescription>
            }

            <FieldGroup data-slot="checkbox-group" className="grid grid-cols-2 gap-2">
                {visibleItems.length === 0 ?
                    <FieldDescription>
                        Nothing to display.
                    </FieldDescription>
                    :
                    visibleItems.map(value => {
                        const checked = selected.includes(value);
                        const itemDisabled = disabled || (maxSelected !== undefined && selected.length >= maxSelected && !checked);

                        return (
                            <MediaFilterCheckbox
                                key={value}
                                checked={checked}
                                disabled={itemDisabled}
                                label={renderLabel ? renderLabel(value) : value}
                                onChange={nextChecked => onChange(nextChecked
                                    ? [...selected, value]
                                    : selected.filter(item => item !== value)
                                )}
                            />
                        );
                    })
                }
            </FieldGroup>
            {items.length > initialVisibleItems &&
                <Button type="button" size="xs" variant="outline" className="w-fit" disabled={disabled} onClick={() => setShowAll(current => !current)}>
                    {showAll
                        ? <>Less <ChevronUp data-icon="inline-end"/></>
                        : <>More <ChevronDown data-icon="inline-end"/></>
                    }
                </Button>
            }
            <FieldError id={errorId}>{error}</FieldError>
        </FieldSet>
    );
};
