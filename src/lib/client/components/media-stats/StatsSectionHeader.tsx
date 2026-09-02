import {ReactNode} from "react";


interface StatsSectionHeaderProps {
    index: string;
    title: string;
    color?: string;
    roomy?: boolean;
    aside?: ReactNode;
    description: ReactNode;
}


export function StatsSectionHeader({ index, title, description, aside, color = "var(--brand)", roomy = false }: StatsSectionHeaderProps) {
    return (
        <div
            className={`
                ${roomy ? "mb-8" : "mb-6"} grid gap-4
                ${aside ? "sm:grid-cols-[50px_1fr_auto] sm:items-end" : "sm:grid-cols-[50px_1fr]"}
            `}
        >
            <div className="text-base font-black" style={{ color }}>
                {index}
            </div>
            <div>
                <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                    {title}
                </h3>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
                    {description}
                </p>
            </div>
            {aside}
        </div>
    );
}
