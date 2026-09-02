import path from "node:path";
import {serverEnv} from "@/env/server";
import {Renderer} from "takumi-js/node";
import {createRequire} from "node:module";
import {FontDetails, render} from "takumi-js";
import {capitalize} from "@/lib/utils/text-formatting";
import {getImageFilename} from "@/lib/utils/image-url";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {YearRecap, YearRecapTitle} from "@/lib/types/year-recap.types";
import {formatContinuousTime, formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardStatic, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


const WIDTH = 1080;
const HEIGHT = 1350;
const fontWeights = [400, 700] as const;


const YEAR_RECAP_PALETTE = {
    brand: "#20d69b",
    panel: "#ffffff0b",
    overlay: "#05070dcc",
    mediaCard: "#1c2233",
    foreground: "#f8fafc",
    background: "#080b14",
    metricLabel: "#b5bfd0",
    gradientEnd: "#11111e",
    gradientStart: "#11172a",
    panelBorder: "#ffffff16",
    chartBorder: "#ffffff12",
    overlayStrong: "#05070df8",
    mutedForeground: "#aeb8ca",
    subtleForeground: "#9da8ba",
    metrics: {
        titles: "#29c7e8",
        repeats: "#f47d9f",
        completions: "#8c7cf4",
        activeMonths: "#f2b84b",
    },
    media: {
        [MediaType.SERIES]: "#51c7d5",
        [MediaType.ANIME]: "#ef7d62",
        [MediaType.MOVIES]: "#e6b744",
        [MediaType.GAMES]: "#50bd67",
        [MediaType.BOOKS]: "#ba83d4",
        [MediaType.MANGA]: "#ea6ea8",
    } satisfies Record<MediaType, string>,
} as const;

const YEAR_RECAP_CHART_COLORS = [
    YEAR_RECAP_PALETTE.brand,
    YEAR_RECAP_PALETTE.metrics.titles,
    YEAR_RECAP_PALETTE.metrics.repeats,
    YEAR_RECAP_PALETTE.metrics.completions,
    YEAR_RECAP_PALETTE.metrics.activeMonths,
] as const;

const resolveDependency = createRequire(import.meta.url).resolve;
const feelingLabels = ["Awful", "Disliked", "Not for me", "Liked", "Loved", "Favorite"];
const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fontSubsets = ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext", "hebrew", "vietnamese", "symbols", "math"] as const;


const fontSources: (Omit<FontDetails, "data"> & { file: string })[] = [
    ...fontSubsets.flatMap((subset, subsetRank) => fontWeights.map((weight) => ({
        weight,
        subsetRank,
        subsetOf: "Open Sans",
        name: `Open Sans ${subset}`,
        file: `@fontsource/open-sans/files/open-sans-${subset}-${weight}-normal.woff`,
    }))),
    ...Array.from({ length: 120 }, (_, subsetRank) => ({
        subsetRank,
        subsetOf: "Noto Sans JP",
        name: `Noto Sans JP ${subsetRank}`,
        file: `@fontsource-variable/noto-sans-jp/files/noto-sans-jp-${subsetRank}-wght-normal.woff2`,
    })),
    ...Array.from({ length: 10 }, (_, subsetRank) => ({
        subsetRank,
        weight: 400,
        subsetOf: "Noto Emoji",
        name: `Noto Emoji ${subsetRank}`,
        generic: "emoji" as const,
        file: `@fontsource-variable/noto-emoji/files/noto-emoji-${subsetRank}-wght-normal.woff2`,
    })),
];


export const yearRecapImageRenderer = Promise.all(fontSources.map(async ({ file, ...font }) => {
    return {
        ...font,
        data: await Bun.file(resolveDependency(file)).arrayBuffer(),
    }
})).then(async (fonts) => {
    const renderer = new Renderer();
    await Promise.all(fonts.map((font) => renderer.registerFont(font)));
    return renderer;
});


const coverToDataUrl = async (title: YearRecapTitle) => {
    const uploadsRoot = path.isAbsolute(serverEnv.BASE_UPLOADS_LOCATION)
        ? serverEnv.BASE_UPLOADS_LOCATION
        : path.join(process.cwd(), serverEnv.BASE_UPLOADS_LOCATION);

    const cover = Bun.file(path.join(uploadsRoot, `${title.mediaType}-covers`, getImageFilename(title.imageCover)));

    if (!await cover.exists()) return null;
    const mimeType = cover.type || "image/jpeg";

    return `data:${mimeType};base64,${Buffer.from(await cover.arrayBuffer()).toString("base64")}`;
};


export const renderYearRecapImage = async (recap: YearRecap) => {
    const topTitles = await Promise.all(recap.topTitles.map(async (title) => {
        const ratingLabel = title.rating === null
            ? (title.favorite ? "FAVORITE" : null)
            : recap.user.ratingSystem === RatingSystemType.FEELING
                ? feelingLabels[Math.max(0, Math.min(5, Math.round(title.rating / 2)))]
                : `${formatNumber(title.rating, { fractionDigits: 1, locale: "en" })}`;

        return {
            ...title,
            ratingLabel,
            coverDataUrl: await coverToDataUrl(title),
        };
    }));

    const accent = recap.scope === "all" ? YEAR_RECAP_PALETTE.brand : YEAR_RECAP_PALETTE.media[recap.scope];
    const maximumMonth = Math.max(...recap.months.map((month) => month.hours), 1);
    const scopeLabel = recap.scope === "all" ? "ALL MEDIA" : recap.scope.toUpperCase();

    const png = await render(
        <div
            className="flex h-337.5 w-270 flex-col px-15.5 py-11.5"
            style={{
                color: YEAR_RECAP_PALETTE.foreground,
                backgroundColor: YEAR_RECAP_PALETTE.background,
                fontFamily: "Open Sans, Noto Sans JP, Noto Emoji",
                backgroundImage: `radial-gradient(circle at 92% 4%, ${accent}55 0%, transparent 32%),
                linear-gradient(145deg, ${YEAR_RECAP_PALETTE.gradientStart} 0%, ${YEAR_RECAP_PALETTE.background} 48%,
                ${YEAR_RECAP_PALETTE.gradientEnd} 100%)`,
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="h-2 w-13 rounded-lg" style={{ backgroundColor: accent }}/>
                    <span className="text-[22px] font-bold tracking-[4px]">
                        MYLISTS YEAR RECAP
                    </span>
                </div>
                <span className="text-[20px] font-bold tracking-[3px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                    {scopeLabel}
                </span>
            </div>

            <div className="mt-5 flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-[144px] font-bold leading-none tracking-[-9px]">
                        {recap.year}
                    </span>
                    <span className="mt-2 text-[34px] font-bold">
                        {recap.user.name}
                    </span>
                </div>
                <div className="flex flex-col items-end pb-2.5">
                    <span className="text-[48px] font-bold" style={{ color: accent }}>
                        {formatContinuousTime(recap.totals.hours)}
                    </span>
                    <span className="text-[18px] tracking-[2px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                        TIME TRACKED
                    </span>
                </div>
            </div>

            <div className="mt-6.5 flex items-center">
                <span className="text-[16px] font-bold tracking-[2.5px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                    TITLES THAT DEFINED THE YEAR
                </span>
            </div>
            <div className="mt-3.5 flex gap-3">
                {topTitles.map((title) =>
                    <MediaCardStatic
                        key={`${title.mediaType}-${title.mediaId}`}
                        className="relative h-52.5 w-37.25 flex-[0_0_149px] overflow-hidden rounded-[10px] border text-white"
                        style={{
                            borderColor: YEAR_RECAP_PALETTE.mediaCard,
                            backgroundColor: YEAR_RECAP_PALETTE.mediaCard,
                        }}
                        item={{
                            mediaName: title.name,
                            mediaId: title.mediaId,
                            imageCover: title.coverDataUrl ?? undefined,
                        }}
                    >
                        {title.ratingLabel &&
                            <span
                                className="absolute left-2 top-2 z-20 rounded-full border px-2 py-1 text-[10px] font-bold leading-none text-white"
                                style={{
                                    backgroundColor: YEAR_RECAP_PALETTE.overlay,
                                    borderColor: YEAR_RECAP_PALETTE.media[title.mediaType],
                                }}
                            >
                                {title.ratingLabel}
                            </span>
                        }
                        <MediaCardFooter
                            className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-2.5 pb-2.75 pt-9"
                            style={{
                                backgroundImage: `linear-gradient(to top, ${YEAR_RECAP_PALETTE.overlayStrong} 12%,
                                ${YEAR_RECAP_PALETTE.overlay} 58%, transparent 100%)`,
                            }}
                        >
                            <MediaCardTitle
                                title={title.name}
                                className="min-w-0 truncate text-[11px] font-bold leading-[1.15]"
                            >
                                {title.name}
                            </MediaCardTitle>
                            <MediaCardMeta
                                style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}
                                className="flex items-center justify-between gap-1.25 text-[9px] font-bold"
                            >
                                <MediaCardDetails
                                    className="flex items-center gap-1 tracking-[0.7px]"
                                    style={{ color: YEAR_RECAP_PALETTE.media[title.mediaType] }}
                                >
                                    {recap.scope === "all" &&
                                        <span>{title.mediaType.toUpperCase()}</span>
                                    }
                                    {title.releaseDate &&
                                        <span>{title.releaseDate.slice(0, 4)}</span>
                                    }
                                </MediaCardDetails>
                            </MediaCardMeta>
                        </MediaCardFooter>
                    </MediaCardStatic>
                )}
            </div>

            <div className="mt-6.5 flex gap-3.5">
                {[
                    [formatNumber(recap.totals.titleCount), "TITLES", YEAR_RECAP_PALETTE.metrics.titles],
                    [formatNumber(recap.totals.completions), "COMPLETIONS", YEAR_RECAP_PALETTE.metrics.completions],
                    [formatNumber(recap.totals.repeats), "REPEATS", YEAR_RECAP_PALETTE.metrics.repeats],
                    [`${recap.totals.activeMonths}/12`, "ACTIVE MONTHS", YEAR_RECAP_PALETTE.metrics.activeMonths],
                ].map(([value, label, color]) =>
                    <div
                        key={label}
                        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}55` }}
                        className="flex h-26 w-57.25 flex-col justify-center rounded-[18px] px-5.5"
                    >
                        <span className="text-[34px] font-bold" style={{ color }}>
                            {value}
                        </span>
                        <span
                            style={{ color: YEAR_RECAP_PALETTE.metricLabel }}
                            className="mt-1.25 text-[15px] font-bold tracking-[1.5px]"
                        >
                            {label}
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-8 flex flex-col">
                <span className="text-[18px] font-bold tracking-[3px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                    THE YEAR IN MOTION
                </span>
                <div
                    className="mt-3.5 flex h-48.5 items-end gap-3.5 rounded-[20px] border px-5 pb-3 pt-4.5"
                    style={{ borderColor: YEAR_RECAP_PALETTE.chartBorder, backgroundColor: YEAR_RECAP_PALETTE.panel }}
                >
                    {recap.months.map((month, idx) => {
                        const barHeight = Math.max(month.hours > 0 ? 10 : 3, (month.hours / maximumMonth) * 128);

                        const barColor = recap.scope === "all"
                            ? YEAR_RECAP_CHART_COLORS[idx % YEAR_RECAP_CHART_COLORS.length]
                            : accent;

                        return (
                            <div key={month.month} className="flex h-39.5 w-16 flex-col items-center justify-end">
                                <div
                                    className="w-9.5 rounded-t-[7px] rounded-b-[3px]"
                                    style={{ height: barHeight, backgroundColor: barColor }}
                                />
                                <span className="mt-2.5 text-[13px] font-bold" style={{ color: YEAR_RECAP_PALETTE.subtleForeground }}>
                                    {monthNames[idx]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {recap.scope === "all"
                ? <div className="mt-7 flex flex-col">
                    <span className="text-[18px] font-bold tracking-[3px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                        MEDIA MIX
                    </span>
                    <div className="mt-4.25 flex gap-3">
                        {recap.media.map((media) =>
                            <div
                                key={media.mediaType}
                                className="flex min-w-0 flex-1 flex-col rounded-2xl px-4 py-4.5"
                                style={{
                                    backgroundColor: `${YEAR_RECAP_PALETTE.media[media.mediaType]}18`,
                                    border: `1px solid ${YEAR_RECAP_PALETTE.media[media.mediaType]}55`,
                                }}
                            >
                                <span className="text-[17px] font-bold" style={{ color: YEAR_RECAP_PALETTE.media[media.mediaType] }}>
                                    {capitalize(media.mediaType)}
                                </span>
                                <span className="mt-2 text-[25px] font-bold">
                                    {formatPercent(media.share, { fractionDigits: 0 })}
                                </span>
                                <span className="mt-0.75 text-[13px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                                    {formatHours(media.hours)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                : <div className="mt-7 flex gap-4">
                    <div
                        className="flex flex-1 flex-col rounded-[18px] p-5"
                        style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}55` }}
                    >
                        <span className="text-[15px] tracking-[2px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                            FAMOUS TITLE EQUIVALENT
                        </span>
                        <span className="mt-2.5 text-[34px] font-bold" style={{ color: accent }}>
                            {formatNumber(recap.comparison?.referenceCount, { fractionDigits: 1 })}×
                        </span>
                        <span className="mt-1 text-[18px]">
                            {recap.comparison?.referenceLabel}
                        </span>
                    </div>
                    <div
                        className="flex flex-1 flex-col rounded-[18px] border p-5"
                        style={{ borderColor: YEAR_RECAP_PALETTE.panelBorder, backgroundColor: YEAR_RECAP_PALETTE.panel }}
                    >
                        <span className="text-[15px] tracking-[2px]" style={{ color: YEAR_RECAP_PALETTE.mutedForeground }}>
                            ANOTHER WAY TO COUNT IT
                        </span>
                        <span className="mt-2.5 text-[34px] font-bold" style={{ color: YEAR_RECAP_PALETTE.metrics.activeMonths }}>
                            {formatNumber(recap.comparison?.secondaryCount, { fractionDigits: 1 })}
                        </span>
                        <span className="mt-1 text-[18px]">
                            {recap.comparison?.secondaryLabel}
                        </span>
                    </div>
                </div>
            }

            <div
                className="mt-auto flex items-center justify-between border-t pt-6"
                style={{ borderTopColor: YEAR_RECAP_PALETTE.panelBorder }}
            >
                <div className="flex flex-col">
                    <span className="text-[18px] font-bold tracking-[2px]">
                        MYLISTS.INFO
                    </span>
                    <span className="mt-1 text-[14px]" style={{ color: YEAR_RECAP_PALETTE.subtleForeground }}>
                        Annual activity summary.
                    </span>
                </div>
                <span className="text-[18px] font-bold" style={{ color: accent }}>
                    {scopeLabel}
                </span>
            </div>
        </div>,
        {
            width: WIDTH,
            format: "png",
            height: HEIGHT,
            emoji: "from-font",
            renderer: await yearRecapImageRenderer,
            jsx: { tailwindClassesProperty: "className" },
        },
    );
    const scope = recap.scope === "all" ? "all-media" : recap.scope;

    return {
        filename: `${recap.user.name}-${recap.year}-${scope}-recap.png`,
        dataUrl: `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
    };
};
