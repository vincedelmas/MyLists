import {ReactNode} from "react";
import {LucideIcon} from "lucide-react";
import {cn} from "@/lib/utils/classnames";


interface PageHeaderProps {
    title: ReactNode;
    eyebrow: ReactNode;
    className?: string;
    asideIcon?: LucideIcon;
    asideLabel?: ReactNode;
    asideValue?: ReactNode;
    navigation?: ReactNode;
    description?: ReactNode;
    eyebrowIcon: LucideIcon;
    eyebrowClassName?: string;
}


export const PageHeader = (props: PageHeaderProps) => {
    const {
        title,
        eyebrow,
        className,
        asideLabel,
        asideValue,
        navigation,
        description,
        eyebrowClassName,
        asideIcon: AsideIcon,
        eyebrowIcon: EyebrowIcon,
    } = props;

    const hasAside = asideLabel !== undefined || asideValue !== undefined;

    return (
        <div className={className}>
            <header className={cn("flex items-end justify-between gap-8 pb-6 max-sm:flex-col max-sm:items-start", !navigation && "border-b")}>
                <div className="flex min-w-0 flex-col gap-2">
                    <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand", eyebrowClassName)}>
                        <EyebrowIcon className="size-4" aria-hidden="true"/>
                        {eyebrow}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {title}
                    </h1>
                    {description !== undefined &&
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            {description}
                        </p>
                    }
                </div>

                {hasAside &&
                    <div className="flex shrink-0 flex-col items-end gap-1 max-sm:items-start">
                        {asideLabel !== undefined &&
                            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                {asideLabel}
                            </span>
                        }
                        {asideValue !== undefined &&
                            <div className="flex items-center gap-2 text-lg">
                                {AsideIcon &&
                                    <AsideIcon
                                        aria-hidden="true"
                                        className="size-4 text-muted-foreground"
                                    />
                                }
                                {asideValue}
                            </div>
                        }
                    </div>
                }
            </header>

            {navigation}
        </div>
    );
};
