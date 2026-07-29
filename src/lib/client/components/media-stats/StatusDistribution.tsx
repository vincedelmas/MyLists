import {NamedValue} from "@/lib/types/stats.types";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {BarChart3, ChartNoAxesColumn} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {DistributionContainer} from "@/lib/client/components/general/DistributionContainer";
import {SegmentedDistributionBar} from "@/lib/client/components/general/SegmentedDistributionBar";


interface StatusDistributionProps {
    total: number;
    statuses: NamedValue[];
}


export function StatusDistribution({ statuses, total }: StatusDistributionProps) {
    const distribution = statuses
        .filter(({ value }) => value > 0)
        .map(({ name, value }) => ({
            value,
            name: String(name),
            percentage: total > 0 ? (value / total) * 100 : 0,
        }));

    const segments = distribution.map(({ name, percentage }) => ({
        percentage,
        label: name,
        color: getThemeColor(name),
    }))

    return (
        <DistributionContainer label="Status Distribution" icon={BarChart3}>
            {distribution.length === 0 ?
                <EmptyState
                    className="min-h-24"
                    icon={ChartNoAxesColumn}
                    message="No statuses to display yet."
                />
                :
                <>
                    <SegmentedDistributionBar
                        segments={segments}
                    />

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                        {distribution.map(({ name, percentage, value }) =>
                            <div key={name} className="flex items-center gap-1.5 text-sm">
                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: getThemeColor(name) }}/>
                                <span className="font-medium text-muted-foreground">
                                    {name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatNumber(value)} · {formatPercent(percentage)}
                                </span>
                            </div>
                        )}
                    </div>
                </>
            }
        </DistributionContainer>
    );
}
