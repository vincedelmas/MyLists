import type {ReactNode} from "react";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface DynamicListEditorSelectProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly { value: string; label: string }[];
}


export const DynamicListEditorSelect = ({ id, value, options, onChange }: DynamicListEditorSelectProps) => {
    return (
        <Select items={options} value={value} onValueChange={value => value !== null && onChange(value)}>
            <SelectTrigger id={id} className="w-full">
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
