import React from "react";
import {cn} from "@/lib/utils/classnames";
import type {LucideIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface StatCardProps {
    title: string;
    subtitle?: string;
    className?: string;
    icon?: LucideIcon | React.ReactNode;
    value: string | number | React.ReactElement | null;
}


export function StatCard({ title, value, subtitle, icon, className }: StatCardProps) {
    const renderIcon = () => {
        if (!icon) return null;

        if (typeof icon === "function" || (typeof icon === "object" && "render" in icon)) {
            const Icon = icon as React.ComponentType<{ className?: string }>;
            return <Icon className="size-4 text-brand"/>;
        }

        return icon;
    };

    return (
        <Card className={cn("relative min-w-0 overflow-hidden", className)}>
            <CardHeader className="flex min-w-0 flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm text-muted-foreground">
                    {title}
                </CardTitle>
                {icon && renderIcon()}
            </CardHeader>
            <CardContent className="min-w-0">
                <div className="wrap-break-word text-2xl font-bold">
                    {value}
                </div>
                {subtitle &&
                    <p className="text-xs text-muted-foreground mt-1">
                        {subtitle}
                    </p>
                }
            </CardContent>
        </Card>
    );
}
