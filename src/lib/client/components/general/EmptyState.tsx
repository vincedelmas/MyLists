import {LucideIcon} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Empty, EmptyDescription, EmptyMedia} from "@/lib/client/components/ui/empty";


interface EmptyStateProps {
    message: string;
    icon: LucideIcon;
    iconSize?: number;
    className?: string;
}


export const EmptyState = ({ icon: Icon, message, className, iconSize = 30 }: EmptyStateProps) => {
    return (
        <Empty className={cn("h-full flex-initial gap-0 rounded-none p-0 text-muted-foreground", className)}>
            <EmptyMedia>
                <Icon
                    size={iconSize}
                    className="opacity-30"
                />
            </EmptyMedia>
            <EmptyDescription>
                {message}
            </EmptyDescription>
        </Empty>
    );
}
