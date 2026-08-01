import React from "react";
import {LucideIcon} from "lucide-react";


interface DistributionContainerProps {
    label: string;
    icon: LucideIcon;
    children: React.ReactNode;
}


export const DistributionContainer = ({ label, icon: Icon, children }: DistributionContainerProps) => {
    return (
        <div className="border rounded-xl p-4 px-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Icon className="size-4 text-brand"/>
                <span className="text-sm font-semibold text-foreground">
                    {label}
                </span>
            </div>
            {children}
        </div>
    );
};
