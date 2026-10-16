import {ArrowUpRight} from "lucide-react";
import {cn} from "@/lib/utils/classnames";


export const navigationCardClassName = "group/navigation transition-colors duration-200 hover:border-brand/30 hover:ring-brand/30 hover:bg-muted/40";


export const NavigationArrow = ({ className }: { className?: string }) => {
    return (
        <ArrowUpRight
            aria-hidden="true"
            className={cn("size-3.5 shrink-0 text-muted-foreground/50 transition-[translate,color] duration-200 " +
                "group-hover/navigation:text-foreground group-focus-visible/navigation:text-foreground " +
                "group-has-[>a:focus-visible]/navigation:text-foreground " +
                "motion-safe:group-hover/navigation:-translate-y-0.5 motion-safe:group-hover/navigation:translate-x-0.5 " +
                "motion-safe:group-focus-visible/navigation:-translate-y-0.5 motion-safe:group-focus-visible/navigation:translate-x-0.5 " +
                "motion-safe:group-has-[>a:focus-visible]/navigation:-translate-y-0.5 motion-safe:group-has-[>a:focus-visible]/navigation:translate-x-0.5",
                className)}
        />
    );
}
