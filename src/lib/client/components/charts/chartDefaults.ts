import {tooltip} from "@tanstack/charts/tooltip";
import type {ChartAxisPresentationOptions, ChartTheme} from "@tanstack/charts";


export const chartAxisStyle = {
    line: false,
    ticks: {
        size: 0,
    },
    tickLabels: {
        opacity: 1.0,
        fontSize: 11,
    },
} satisfies ChartAxisPresentationOptions;


export const chartThemes = {
    default: {
        grid: "var(--primary-foreground)",
        muted: "var(--primary-foreground)",
        foreground: "var(--primary-foreground)",
    },
} satisfies Record<string, Partial<ChartTheme>>;


export const chartTooltipOptions = {
    use: tooltip,
    sticky: false,
    className: "mylists-chart-tooltip",
    placement: ["top", "right", "left", "bottom"],
} as const;
