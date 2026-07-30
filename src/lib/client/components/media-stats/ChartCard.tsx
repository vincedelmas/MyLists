import {ReactNode} from "react";
import {ChartNoAxesColumn} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


type ChartSummaryItem = {
    label: string;
    value: string;
};


interface ChartCardProps {
    title: string;
    height: number;
    hasData: boolean;
    children: ReactNode;
    description?: string;
    emptyMessage?: string;
    summary?: ChartSummaryItem[];
}


export function ChartCard({ title, height, hasData, children, description, summary = [], emptyMessage = "No data to display yet." }: ChartCardProps) {
    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader className="min-h-14 gap-1 pb-2">
                <CardTitle className="text-base">
                    {title}
                </CardTitle>
                {description &&
                    <CardDescription>
                        {description}
                    </CardDescription>
                }
            </CardHeader>
            <CardContent>
                {hasData ?
                    <>
                        {children}
                        {summary.length > 0 &&
                            <ul className="sr-only" aria-label={`${title} data`}>
                                {summary.map((item) =>
                                    <li key={`${item.label}-${item.value}`}>
                                        {item.label}: {item.value}
                                    </li>
                                )}
                            </ul>
                        }
                    </>
                    :
                    <div style={{ height }}>
                        <EmptyState
                            message={emptyMessage}
                            icon={ChartNoAxesColumn}
                        />
                    </div>
                }
            </CardContent>
        </Card>
    );
}
