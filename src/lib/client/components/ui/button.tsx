import * as React from "react";
import {cn} from "@/lib/utils/classnames";
import {cva, type VariantProps} from "class-variance-authority";
import {Button as ButtonPrimitive} from "@base-ui/react/button";


const buttonVariants = cva("group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent " +
    "bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring " +
    "focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none " +
    "disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 " +
    "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 " +
    "[&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/80",

                emeraldy: "bg-app-accent/30 text-primary hover:bg-app-accent/50 backdrop-blur-xl",
                dashed: "border border-dashed text-muted-foreground text-xs w-full bg-background hover:bg-accent hover:text-accent-foreground " +
                    "dark:bg-input/30 dark:border-input dark:hover:bg-input/50",

                link: "text-primary underline-offset-4 hover:underline",
                ghost: "hover:text-foreground aria-expanded:text-foreground",
                outline: "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted " +
                    "aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
                secondary: "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] " +
                    "aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
                destructive: "bg-destructive/10 text-primary hover:bg-destructive/20 focus-visible:border-destructive/40 " +
                    "focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
            },
            size: {
                icon: "size-8",
                bare: "size-auto rounded-none p-0",
                default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
                xs: "h-6 gap-1.5 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg " +
                    "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-7 gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg " +
                    "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
                lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
                "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
                "icon-lg": "size-9",
            },
        },
        defaultVariants: {
            size: "default",
            variant: "default",
        },
    }
)


function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
    return (
        <ButtonPrimitive
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}


export {Button, buttonVariants};
