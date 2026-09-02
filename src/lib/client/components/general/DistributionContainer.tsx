import React from "react";
import {LucideIcon} from "lucide-react";
import {getThemeColor} from "@/lib/utils/theme-utils";


interface DistributionContainerProps {
    label: string;
    icon: LucideIcon;
    mediaType?: string;
    children: React.ReactNode;
}


export const DistributionContainer = ({ label, mediaType, icon: Icon, children }: DistributionContainerProps) => {
    return (
        <div className="border-t p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
                <Icon
                    className="size-4"
                    style={{ color: getThemeColor(mediaType ? mediaType : "brand") }}
                />
                <span className="text-sm font-semibold text-foreground">
                    {label}
                </span>
            </div>
            {children}
        </div>
    );
};
