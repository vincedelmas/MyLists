import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";


interface SectionHeaderProps {
    title: string;
    action?: ReactNode;
    className?: string;
    description?: ReactNode;
}


export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
    return (
        <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
            <div>
                <h2 className="text-base font-medium">
                    {title}
                </h2>
                {description &&
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                }
            </div>
            {action}
        </div>
    );
}
