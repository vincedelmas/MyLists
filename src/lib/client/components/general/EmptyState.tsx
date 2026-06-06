import {cn} from "@/lib/utils/classnames";
import {LucideIcon} from "lucide-react";


interface EmptyStateProps {
    message: string;
    icon: LucideIcon;
    iconSize?: number;
    className?: string;
}


export const EmptyState = ({ icon: Icon, message, className, iconSize = 30 }: EmptyStateProps) => {
    return (
        <div className={cn("flex flex-col items-center justify-center w-full h-full text-muted-foreground", className)}>
            <Icon
                size={iconSize}
                className="mb-2 opacity-30"
            />
            <p className="text-sm">
                {message}
            </p>
        </div>
    );
}
