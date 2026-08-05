import React from "react";
import {Search} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/lib/client/components/ui/input-group";


interface SearchInputProps extends Omit<React.ComponentProps<typeof InputGroupInput>, "className" | "type"> {
    className?: string;
    inputClassName?: string;
}


export const SearchInput = ({ className, inputClassName, ...props }: SearchInputProps) => {
    return (
        <InputGroup className={className}>
            <InputGroupInput
                {...props}
                type="search"
                className={cn("text-sm", inputClassName)}
            />
            <InputGroupAddon>
                <Search aria-hidden="true"/>
            </InputGroupAddon>
        </InputGroup>
    );
};
