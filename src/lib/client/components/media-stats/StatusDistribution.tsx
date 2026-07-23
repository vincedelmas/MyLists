import {Status} from "@/lib/utils/enums";
import {NamedValue} from "@/lib/types/stats.types";
import {formatPercent} from "@/lib/utils/number-formatting";
import {StatusBullet} from "@/lib/client/components/general/StatusBullet";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface StatusDistributionProps {
    total: number;
    statuses: NamedValue[];
}


export function StatusDistribution({ statuses, total }: StatusDistributionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base mb-0">
                    Status Distribution
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-12 gap-y-4">
                {statuses.map(({ name, value }) => {
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
                                    {value}
                                    <div className="text-xs">
                                        ({formatPercent(percentage)})
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
