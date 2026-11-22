import * as React from "react";
import {SearchIcon} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Command as CommandPrimitive} from "cmdk";
import {InputGroup, InputGroupAddon} from "@/lib/client/components/ui/input-group";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
    return (
        <CommandPrimitive
            data-slot="command"
            className={cn(
                "flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground",
                className,
            )}
            {...props}
        />
    );
}


function CommandDialog({
    title = "Command Palette",
    description = "Search your lists, collections, dynamic lists, and pages.",
    children,
    className,
    finalFocus,
    showCloseButton = false,
    ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
    title?: string;
    className?: string;
    description?: string;
    finalFocus?: React.ComponentProps<typeof DialogContent>["finalFocus"];
    showCloseButton?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Dialog {...props}>
            <DialogContent
                finalFocus={finalFocus}
                showCloseButton={showCloseButton}
                className={cn(
                    "top-[14%] translate-y-0 overflow-hidden rounded-xl! p-0 sm:top-[20%] sm:max-w-lg",
                    className,
                )}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}


function CommandInput({
    className,
    endAddon,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & { endAddon?: React.ReactNode }) {
    return (
        <div data-slot="command-input-wrapper" className="p-1 pb-0">
            <InputGroup className="h-9! rounded-lg! border-input/40 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2.5!">
                <InputGroupAddon align="inline-start">
                    <SearchIcon className="size-4 shrink-0 opacity-50" aria-hidden="true"/>
                </InputGroupAddon>
                <CommandPrimitive.Input
                    data-slot="command-input"
                    className={cn(
                        "w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                    {...props}
                />
                {endAddon &&
                    <InputGroupAddon align="inline-end" className="pr-2.5!">
                        {endAddon}
                    </InputGroupAddon>
                }
            </InputGroup>
        </div>
    );
}


function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
    return (
        <CommandPrimitive.List
            data-slot="command-list"
            className={cn(
                "max-h-[min(60dvh,24rem)] scroll-py-1 overflow-x-hidden overflow-y-auto scrollbar-thin outline-none",
                className,
            )}
            {...props}
        />
    );
}


function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
    return (
        <CommandPrimitive.Empty
            data-slot="command-empty"
            className={cn("py-6 text-center text-sm text-muted-foreground", className)}
            {...props}
        />
    );
}


function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
    return (
        <CommandPrimitive.Group
            data-slot="command-group"
            className={cn(
                "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 " +
                "**:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
                className,
            )}
            {...props}
        />
    );
}


function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
    return (
        <CommandPrimitive.Separator
            data-slot="command-separator"
            className={cn("-mx-1 my-1 h-px bg-border", className)}
            {...props}
        />
    );
}


function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item
            data-slot="command-item"
            className={cn(
                "group/command-item relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-hidden select-none " +
                "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 " +
                "data-[selected=true]:bg-muted data-[selected=true]:text-foreground " +
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        />
    );
}


function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            data-slot="command-shortcut"
            className={cn(
                "ml-auto text-xs tracking-widest text-muted-foreground group-data-[selected=true]/command-item:text-foreground",
                className,
            )}
            {...props}
        />
    );
}


export {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
};
