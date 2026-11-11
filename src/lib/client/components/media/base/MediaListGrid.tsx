import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";


export const MediaListGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 lg:grid-cols-6", className)}>
        {children}
    </div>
);
