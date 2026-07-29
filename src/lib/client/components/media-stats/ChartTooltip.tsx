import {TooltipContentProps} from "recharts";
import {formatNumber} from "@/lib/utils/number-formatting";


interface ChartTooltipProps extends Partial<Omit<TooltipContentProps<number, string>, "labelFormatter">> {
    labelFormatter?: (label: string) => string;
    valueFormatter?: (value: number) => string;
    valueFormatter
}


export function ChartTooltip(props: ChartTooltipProps) {
    const {
        label,
        active,
        payload,
        labelFormatter = (val) => val,
        valueFormatter = (val) => formatNumber(val, { fractionDigits: 0 }),
    } = props;

    if (!active || !payload?.length) return null;

    const firstValue = Number(payload[0].value);
    const displayLabel = labelFormatter(String(label ?? ""));

    return (
        <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
            <p className="font-medium">
                {displayLabel}
            </p>
            <p className="mt-0.5 text-muted-foreground">
                {valueFormatter(firstValue)}
            </p>
        </div>
    );
}
