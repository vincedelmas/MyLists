import {CircleHelp} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {ComponentProps, ReactNode} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger} from "@/lib/client/components/ui/popover";


interface InfoPopoverProps {
    label: string;
    title?: ReactNode;
    children?: ReactNode;
    iconClassName?: string;
    description?: ReactNode;
    triggerClassName?: string;
    contentClassName?: string;
    side?: ComponentProps<typeof PopoverContent>["side"];
    align?: ComponentProps<typeof PopoverContent>["align"];
}


export const InfoPopover = (props: InfoPopoverProps) => {
    const { label, title, children, description, align, side, iconClassName, triggerClassName, contentClassName } = props;

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        size="bare"
                        type="button"
                        variant="ghost"
                        aria-label={label}
                        className={cn("inline-flex cursor-help opacity-70 hover:opacity-100", triggerClassName)}
                    />
                }
            >
                <CircleHelp
                    aria-hidden="true"
                    className={cn("size-4", iconClassName)}
                />
            </PopoverTrigger>
            <PopoverContent className={cn("w-80 p-4", contentClassName)} align={align} side={side}>
                {(title || description) &&
                    <PopoverHeader>
                        {title && <PopoverTitle>{title}</PopoverTitle>}
                        {description &&
                            <PopoverDescription className="font-medium">
                                {description}
                            </PopoverDescription>
                        }
                    </PopoverHeader>
                }
                {children}
            </PopoverContent>
        </Popover>
    );
}
