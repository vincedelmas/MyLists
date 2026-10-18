import type {ReactNode} from "react";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface FilterSelectProps<T extends string> {
    id?: string;
    label: string;
    value: T | null;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    onChange: (value: T) => void;
    options: readonly {
        value: T;
        label: ReactNode;
    }[];
}


export function FilterSelect<T extends string>(props: FilterSelectProps<T>) {
    const { id, label, value, options, onChange, disabled, className, placeholder } = props;

    return (
        <Select
            value={value}
            items={options}
            disabled={disabled}
            onValueChange={value => {
                if (value !== null) onChange(value);
            }}
        >
            <SelectTrigger id={id} aria-label={label} className={className}>
                <SelectValue placeholder={placeholder}/>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {options.map(option =>
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
