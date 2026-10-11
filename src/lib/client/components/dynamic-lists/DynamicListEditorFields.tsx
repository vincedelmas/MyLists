import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface DynamicListEditorSelectProps {
    id: string;
    value: string;
    disabled?: boolean;
    className?: string;
    "aria-label"?: string;
    onChange: (value: string) => void;
    options: readonly { value: string; label: ReactNode }[];
}


export const DynamicListEditorSelect = ({ id, value, options, onChange, disabled, className, "aria-label": ariaLabel }: DynamicListEditorSelectProps) => {
    return (
        <Select items={options} value={value} disabled={disabled} onValueChange={value => value !== null && onChange(value)}>
            <SelectTrigger id={id} className={cn("w-full", className)} aria-label={ariaLabel}>
                <SelectValue/>
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


interface DynamicListEditorSectionProps {
    title: string;
    number?: string;
    description: string;
    children: ReactNode;
}


export const DynamicListEditorSection = ({ number, title, description, children }: DynamicListEditorSectionProps) => {
    return (
        <Card className="overflow-visible">
            <CardHeader>
                <CardTitle>
                    <h2 className="flex items-center gap-3">
                        {number && <span className="text-xs tabular-nums text-muted-foreground">{number}</span>}
                        {title}
                    </h2>
                </CardTitle>
                <CardDescription>
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <FieldGroup>
                    {children}
                </FieldGroup>
            </CardContent>
        </Card>
    );
}
