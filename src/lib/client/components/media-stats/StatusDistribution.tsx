import {Status} from "@/lib/utils/enums";
import {ChartNoAxesColumn} from "lucide-react";
import {NamedValue} from "@/lib/types/stats.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {StatusBullet} from "@/lib/client/components/general/StatusBullet";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface StatusDistributionProps {
    total: number;
    statuses: NamedValue[];
}


export function StatusDistribution({ statuses, total }: StatusDistributionProps) {
    const hasStatuses = statuses.some(({ value }) => value > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base mb-0">
                    Status Distribution
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-12 gap-y-4">
                {!hasStatuses ?
                    <EmptyState
                        className="min-h-24"
                        icon={ChartNoAxesColumn}
                        message="No statuses to display yet."
                    />
                    :
                    statuses.map(({ name, value }) => {
                        const percentage = total > 0 ? (value / total) * 100 : 0;

                        return (
                            <div key={name} className="flex items-center justify-start font-semibold">
                                <StatusBullet
                                    className="size-4 mr-3"
                                    status={name as Status}
                                />
                                <div>
                                    <div className="text-muted-foreground">
                                        {name}
                                    </div>
                                    <div className="flex items-baseline gap-1 text-lg max-sm:text-base">
                                        {formatNumber(value)}
                                        <div className="text-xs">
                                            ({formatPercent(percentage)})
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
            </CardContent>
        </Card>
    );
}
