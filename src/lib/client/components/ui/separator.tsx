import {cn} from "@/lib/utils/classnames";
import {Separator as SeparatorPrimitive} from "@base-ui/react/separator";


function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
    return (
        <SeparatorPrimitive
            data-slot="separator"
            orientation={orientation}
            className={cn("shrink-0 bg-border border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px " +
                "data-vertical:self-stretch", className
            )}
            {...props}
        />
    )
}


export {Separator};
