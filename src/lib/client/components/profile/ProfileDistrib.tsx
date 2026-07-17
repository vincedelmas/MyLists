import {LucideIcon} from "lucide-react";


interface DistributionContainerProps {
    label: string,
    icon: LucideIcon,
    children: React.ReactNode,
}


export const DistributionContainer = ({ label, icon: Icon, children }: DistributionContainerProps) => {
    return (
        <div className="bg-card border rounded-xl p-4 px-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Icon className="size-4 text-app-accent"/>
                <span className="text-sm font-semibold text-primary">
                    {label}
                </span>
            </div>

            {children}
        </div>
    );
}
