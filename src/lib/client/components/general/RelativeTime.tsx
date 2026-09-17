import {cn} from "@/lib/utils/classnames";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {formatDateTime, formatRelativeTime, toDateTimeAttribute} from "@/lib/utils/formatting/date";


interface RelativeTimeProps {
    prefix?: string;
    className?: string;
    date: string | number | null | undefined;
    formatOptions?: Intl.RelativeTimeFormatOptions;
}


export function RelativeTime({ date, className, prefix, formatOptions }: RelativeTimeProps) {
    const dateTime = formatDateTime(date);
    const dateTimeAttribute = toDateTimeAttribute(date);
    const relativeTime = formatRelativeTime(date, formatOptions);

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <button
                        type="button"
                        aria-label={dateTime === DEFAULT_DASH_FALLBACK ? relativeTime : `${relativeTime}, ${dateTime}`}
                        className={cn("inline-flex w-fit cursor-help appearance-none rounded-sm bg-transparent p-0 " +
                            "text-left align-baseline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2",
                            className
                        )}
                    />
                }
            >
                <time dateTime={dateTimeAttribute}>
                    {prefix}{relativeTime}
                </time>
            </PopoverTrigger>
            <PopoverContent className="w-auto px-3 py-2 text-xs" side="top">
                {dateTime === DEFAULT_DASH_FALLBACK ? relativeTime : dateTime}
            </PopoverContent>
        </Popover>
    );
}
