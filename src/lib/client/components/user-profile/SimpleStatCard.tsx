import React from "react";
import {cn} from "@/lib/utils/classnames";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface StatCardProps {
    value?: any;
    title: string;
    className?: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}


export const SimpleStatCard = ({ title, value, icon, className, children }: StatCardProps) => {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-4 px-5 bg-card border",
            "rounded-xl overflow-hidden shadow-sm", className)
        }>
            <span className="text-xs text-muted-foreground uppercase font-medium tracking-wide mb-1">
                {title}
            </span>
            <div className="flex items-center gap-2">
                {icon}
                {children ||
                    <span className="text-3xl font-bold text-primary">
                        {value ?? DEFAULT_DASH_FALLBACK}
                    </span>
                }
            </div>
        </div>
    );
};
