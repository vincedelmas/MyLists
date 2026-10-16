import {Search} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Combobox as ComboboxPrimitive} from "@base-ui/react/combobox";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/lib/client/components/ui/input-group";


const Combobox = ComboboxPrimitive.Root;
const ComboboxEmpty = ComboboxPrimitive.Empty;
const ComboboxStatus = ComboboxPrimitive.Status;


type ComboboxContentProps = ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, "side" | "sideOffset" | "align">;


interface ComboboxInputProps extends Omit<ComboboxPrimitive.Input.Props, "className" | "render"> {
    className?: string;
    inputClassName?: string;
}


function ComboboxInput({ className, inputClassName, ...props }: ComboboxInputProps) {
    return (
        <ComboboxPrimitive.InputGroup render={<InputGroup className={className}/>}>
            <ComboboxPrimitive.Input
                render={<InputGroupInput className={cn("text-sm", inputClassName)}/>}
                {...props}
            />
            <InputGroupAddon>
                <Search aria-hidden="true"/>
            </InputGroupAddon>
        </ComboboxPrimitive.InputGroup>
    );
}


function ComboboxContent({ className, side = "bottom", sideOffset = 4, align = "start", ...props }: ComboboxContentProps) {
    return (
        <ComboboxPrimitive.Portal>
            <ComboboxPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} className="isolate z-50">
                <ComboboxPrimitive.Popup
                    data-slot="combobox-content"
                    className={cn("flex max-h-[min(var(--available-height),20rem)] w-(--anchor-width) max-w-(--available-width) " +
                        "flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 " +
                        "ring-foreground/10 outline-hidden", className)}
                    {...props}
                />
            </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
    );
}


function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
    return (
        <ComboboxPrimitive.List
            data-slot="combobox-list"
            className={cn("flex min-h-0 flex-col gap-1 overflow-y-auto scrollbar-thin overscroll-contain p-1", className)}
            {...props}
        />
    );
}


function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
    return (
        <ComboboxPrimitive.Item
            data-slot="combobox-item"
            className={cn("flex w-full shrink-0 cursor-default items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none " +
                "select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50", className)}
            {...props}
        />
    );
}


export {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxStatus};
