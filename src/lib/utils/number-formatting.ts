type NumericValue = number | null | undefined;

type FormatNumberOptions = Intl.NumberFormatOptions & {
    locale?: string;
    fallback?: string;
    fractionDigits?: number;
};

const DEFAULT_FALLBACK = "-";
const numberFormatters = new Map<string, Intl.NumberFormat>();


const getNumberFormatter = (locale: string, options: Intl.NumberFormatOptions) => {
    const cacheKey = `${locale}|${JSON.stringify(options)}`;

    const cached = numberFormatters.get(cacheKey);
    if (cached) return cached;

    const formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(cacheKey, formatter);

    return formatter;
};


export const zeroPad = (value: number | string | null | undefined) => {
    const numericValue = Number(value ?? 0);
    return String(Number.isFinite(numericValue) ? Math.trunc(numericValue) : 0).padStart(2, "0");
};


export const formatNumber = (value: NumericValue, opts: FormatNumberOptions = {}) => {
    const { locale = "fr", fractionDigits, fallback = DEFAULT_FALLBACK, ...formatOptions } = opts;

    if (value === null || value === undefined || !Number.isFinite(value)) {
        return fallback;
    }

    return getNumberFormatter(locale, {
        ...(fractionDigits === undefined ? {} : { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits }),
        ...formatOptions,
    }).format(value);
};


export const formatCurrency = (value: NumericValue, opts: Intl.NumberFormatOptions = {}) => {
    if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
        return `$ ${DEFAULT_FALLBACK}`;
    }

    return formatNumber(value, {
        locale: "en",
        currency: "USD",
        style: "currency",
        notation: "compact",
        maximumFractionDigits: 1,
        ...opts,
    });
};


export const formatPercent = (value: NumericValue, opts: FormatNumberOptions = {}) => {
    const { locale = "en", fractionDigits = 1, fallback = DEFAULT_FALLBACK, ...formatOptions } = opts;

    const formattedValue = formatNumber(value, { fallback, fractionDigits, locale, ...formatOptions });

    return formattedValue === fallback ? fallback : `${formattedValue}%`;
};


export const formatHours = (hours: number) => {
    if (!Number.isFinite(hours) || hours < 0) return DEFAULT_FALLBACK;

    if (hours < 24) return `${formatNumber(hours, { fractionDigits: 1, locale: "en" })}h`;

    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);

    if (days < 30) return `${days}d ${remainingHours}h`;
    if (days < 365) return `${Math.floor(days / 30)}m ${days % 30}d`;

    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`;
};


export const formatMinutes = (minutes: number | string | null | undefined, options: { onlyHours?: boolean; compact?: boolean } = {}) => {
    const totalMinutes = Number(minutes ?? 0);
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return DEFAULT_FALLBACK;

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.floor(totalMinutes % 60);

    if (options.onlyHours) return `${zeroPad(hours)} h`;
    if (options.compact) return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;

    return `${zeroPad(hours)} h ${zeroPad(remainingMinutes)}`;
};


export const formatMs = (ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) return DEFAULT_FALLBACK;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${formatNumber(ms / 1000, { fractionDigits: 1, locale: "en" })}s`;

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
};


export const formatLevel = (totalTime: number) => {
    if (!Number.isFinite(totalTime) || totalTime <= 0) return 0;
    return (Math.sqrt(400 + 80 * totalTime) - 20) / 40;
};
