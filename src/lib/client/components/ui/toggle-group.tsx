import * as React from "react";
import {cn} from "@/lib/utils/classnames";
import {type VariantProps} from "class-variance-authority";
import {Toggle as TogglePrimitive} from "@base-ui/react/toggle";
import {toggleVariants} from "@/lib/client/components/ui/toggle";
import {ToggleGroup as ToggleGroupPrimitive} from "@base-ui/react/toggle-group";


const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants> & { spacing?: number, orientation?: "horizontal" | "vertical" }>({
    spacing: 2,
    size: "default",
    variant: "default",
    orientation: "horizontal",
})


function ToggleGroup({ className, variant, size, spacing = 2, orientation = "horizontal", children, ...props }: ToggleGroupPrimitive.Props &
    VariantProps<typeof toggleVariants> & { spacing?: number, orientation?: "horizontal" | "vertical" }) {
    return (
        <ToggleGroupPrimitive
            data-size={size}
            data-spacing={spacing}
            data-variant={variant}
            data-slot="toggle-group"
            data-orientation={orientation}
            style={{ "--gap": spacing } as React.CSSProperties}
            className={cn("group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg " +
                "data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[orientation=vertical]:flex-col " +
                "data-[orientation=vertical]:items-stretch",
                className
            )}
            {...props}
        >
            <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
                {children}
            </ToggleGroupContext.Provider>
        </ToggleGroupPrimitive>
    )
}


function ToggleGroupItem({ className, children, variant = "default", size = "default", ...props }: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
    const context = React.useContext(ToggleGroupContext)

    return (
        <TogglePrimitive
            data-slot="toggle-group-item"
            data-spacing={context.spacing}
            data-size={context.size || size}
            data-variant={context.variant || variant}
            className={cn("shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 " +
                "focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 " +
                "group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 " +
                "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-lg " +
                "group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-lg " +
                "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-lg " +
                "group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-lg " +
                "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 " +
                "group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 " +
                "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l " +
                "group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t " +
                "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=brand]:border-l-0 " +
                "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=brand]:first:border-l",
                toggleVariants({
                    size: context.size || size,
                    variant: context.variant || variant,
                }),
                className
            )}
            {...props}
        >
            {children}
        </TogglePrimitive>
    )
}


export {ToggleGroup, ToggleGroupItem}
