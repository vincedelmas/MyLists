import {cn} from "@/lib/utils/classnames";
import {useRender} from "@base-ui/react/use-render";
import {mergeProps} from "@base-ui/react/merge-props";
import {cva, type VariantProps} from "class-variance-authority";


const badgeVariants = cva("group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl " +
    "border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring " +
    "focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 " +
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none " +
    "[&>svg]:size-3!",
    {
        variants: {
            variant: {
                overlay: "border-white/15 bg-black/65 text-white backdrop-blur-sm",
                default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
                secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
                tag: "cursor-pointer text-xs bg-brand/5 text-brand border-brand/20 hover:bg-brand/20",
                success: "border-success/20 bg-success/15 text-success [a]:hover:bg-success/25",
                warning: "border-warning/20 bg-warning/15 text-warning [a]:hover:bg-warning/25",
                info: "border-info/20 bg-info/15 text-info [a]:hover:bg-info/25",
                achievement: "border-achievement/20 bg-achievement/15 text-achievement [a]:hover:bg-achievement/25",
                destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 " +
                    "dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
                outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
                ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
                link: "text-brand underline-offset-4 hover:underline",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)


function Badge({ className, variant = "default", render, ...props }: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
    return useRender({
        render,
        defaultTagName: "span",
        state: { slot: "badge", variant },
        props: mergeProps<"span">({ className: cn(badgeVariants({ variant }), className) }, props),
    })
}


export {Badge, badgeVariants}
