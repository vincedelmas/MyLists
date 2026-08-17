import {ReactNode} from "react";


interface StatsHeroProps {
    color?: string;
    title: ReactNode;
    context: ReactNode;
    category: ReactNode;
    metricNote: ReactNode;
    description: ReactNode;
    metricLabel: ReactNode;
    metricValue: ReactNode;
    decoration?: ReactNode;
}


export function StatsHero(props: StatsHeroProps) {
    const { title, context, category, metricNote, description, metricLabel, metricValue, decoration, color = "var(--brand)" } = props;

    return (
        <section className="relative isolate overflow-hidden border-b py-8 sm:py-9">
            {decoration}
            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="max-w-3xl">
                    <div
                        style={{ color }}
                        className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.25em]"
                    >
                        <span>{category}</span>
                        <span className="h-px w-10" style={{ backgroundColor: color }}/>
                        <span>{context}</span>
                    </div>
                    <h2 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                        {title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        {description}
                    </p>
                </div>
                <div className="min-w-60 border-l pl-6 lg:text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {metricLabel}
                    </div>
                    <div className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">
                        {metricValue}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        {metricNote}
                    </div>
                </div>
            </div>
        </section>
    );
}
