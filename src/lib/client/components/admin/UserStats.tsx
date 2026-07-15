import React from "react";
import {type LucideIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle,} from "@/lib/client/components/ui/card";


interface UserStatsProps {
    title: string;
    description: string;
    value: string | number;
    icon: LucideIcon | React.ReactNode;
}


export function UserStats({ title, value, description, icon }: UserStatsProps) {
    const renderIcon = () => {
        if (!icon) return null;

        if (typeof icon === "function" || (typeof icon === "object" && "render" in icon)) {
            const IconComponent = icon as React.ComponentType<{ className?: string }>;
            return <IconComponent className="size-5 text-muted-foreground"/>;
        }

        return icon;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-md font-medium">
                    {title}
                </CardTitle>
                {renderIcon()}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {value}
                </div>
                <p className="text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}
