import {cn} from "@/lib/utils/classnames";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface StatCardProps {
    title: string;
    subtitle?: string;
    className?: string;
    icon?: React.ReactNode;
    value: string | number | React.ReactElement | null;
}


export function StatCard({ title, value, subtitle, icon, className }: StatCardProps) {
    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon &&
                    <div className="text-app-accent">
                        {icon}
                    </div>
                }
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
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
