import React from "react";
import {Search} from "lucide-react";
import {Input} from "@/lib/client/components/ui/input";


interface SearchInputUIProps {
    value: string;
    disabled?: boolean;
    className?: string;
    placeholder: string;
    onChange: (ev: React.ChangeEvent<HTMLInputElement>) => void;
}


export const SearchInput = ({ value, onChange, placeholder, className, disabled }: SearchInputUIProps) => {
    return (
        <div className="relative">
            <Search
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
                type="search"
                value={value}
                disabled={disabled}
                onChange={onChange}
                placeholder={placeholder}
                className={`pl-8 text-sm ${className}`}
            />
        </div>
    );
};
