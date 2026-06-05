import * as React from "react";
import {cn} from "@/lib/utils/classnames";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";


const badgeVariants = cva("inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit " +
    "whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 " +
    "focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive" +
    " transition-[color,box-shadow] overflow-hidden",
    {
        variants: {
            variant: {
                black: "text-primary bg-popover",
                emerald: "text-primary bg-app-accent/50 hover:bg-app-accent/60 border-none px-2.5 py-1",
                tagToAdd: "text-primary bg-cyan-700/70 hover:bg-cyan-700/80 border-none px-2.5 py-1",
                outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
                default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
                secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
                tag: "cursor-pointer border-transparent bg-green-700 text-secondary-foreground hover:bg-green-700/80 px-2.5 py-0.5 text-sm",
                destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 " +
                    "dark:focus-visible:ring-destructive/40 dark:bg-destructive/70",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)


function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : "span";

    return (
        <Comp
            data-slot="badge"
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    )
}


export {Badge, badgeVariants}
