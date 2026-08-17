import path from "node:path";
import {serverEnv} from "@/env/server";
import {Renderer} from "takumi-js/node";
import {createRequire} from "node:module";
import {FontDetails, render} from "takumi-js";
import {RatingSystemType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {getImageFilename} from "@/lib/utils/image-url";
import {YearRecap, YearRecapTitle} from "@/lib/types/year-recap.types";
import {getStaticMediaColor, STATIC_BRAND_COLOR} from "@/lib/utils/theme-utils";
import {formatContinuousTime, formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardStatic, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


const WIDTH = 1080;
const HEIGHT = 1350;

const resolveDependency = createRequire(import.meta.url).resolve;
const feelingLabels = ["Awful", "Disliked", "Not for me", "Liked", "Loved", "Favorite"];
const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const fontWeights = [400, 700] as const;
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

    const accent = recap.scope === "all" ? STATIC_BRAND_COLOR : getStaticMediaColor(recap.scope);
    const maximumMonth = Math.max(...recap.months.map((month) => month.hours), 1);
    const scopeLabel = recap.scope === "all" ? "ALL MEDIA" : recap.scope.toUpperCase();

    const png = await render(
        <div
            className="flex h-337.5 w-270 flex-col px-15.5 py-11.5 text-[#f8fafc]"
            style={{
                backgroundColor: "#080b14",
                fontFamily: "Open Sans, Noto Sans JP, Noto Emoji",
                backgroundImage: `radial-gradient(circle at 92% 4%, ${accent}55 0%, transparent 32%),
                linear-gradient(145deg, #11172a 0%, #080b14 48%, #11111e 100%)`,
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="h-2 w-13 rounded-lg" style={{ backgroundColor: accent }}/>
                    <span className="text-[22px] font-bold tracking-[4px]">
                        MYLISTS YEAR RECAP
                    </span>
                </div>
                <span className="text-[20px] font-bold tracking-[3px] text-[#aeb8ca]">
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
                    <span className="text-[18px] tracking-[2px] text-[#aeb8ca]">
                        TIME TRACKED
                    </span>
                </div>
            </div>

            <div className="mt-6.5 flex items-center">
                <span className="text-[16px] font-bold tracking-[2.5px] text-[#aeb8ca]">
                    TITLES THAT DEFINED THE YEAR
                </span>
            </div>
            <div className="mt-3.5 flex gap-3">
                {topTitles.map((title) =>
                    <MediaCardStatic
                        key={`${title.mediaType}-${title.mediaId}`}
                        item={{
                            mediaName: title.name,
                            mediaId: title.mediaId,
                            imageCover: title.coverDataUrl ?? undefined,
                        }}
                        className="relative h-52.5 w-37.25 flex-[0_0_149px] overflow-hidden rounded-[10px]
                        border-[#1c2233] bg-[#1c2233] text-white"
                    >
                        {title.ratingLabel &&
                            <span
                                className="absolute left-2 top-2 z-20 rounded-full border px-2 py-1 text-[10px]
                                font-bold leading-none text-white"
                                style={{
                                    borderColor: getStaticMediaColor(title.mediaType),
                                    backgroundColor: "#05070dcc",
                                }}
                            >
                                {title.ratingLabel}
                            </span>
                        }
                        <MediaCardFooter
                            className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-2.5 pb-2.75 pt-9"
                            style={{
                                backgroundImage: "linear-gradient(to top, #05070df8 12%, #05070dcc 58%, transparent 100%)",
                            }}
                        >
                            <MediaCardTitle
                                title={title.name}
                                className="min-w-0 truncate text-[11px] font-bold leading-[1.15]"
                            >
                                {title.name}
                            </MediaCardTitle>
                            <MediaCardMeta className="flex items-center justify-between gap-1.25 text-[9px]
                            font-bold text-[#aeb8ca]">
                                <MediaCardDetails
                                    className="flex items-center gap-1 tracking-[0.7px]"
                                    style={{ color: getStaticMediaColor(title.mediaType) }}
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
                    [formatNumber(recap.totals.titleCount), "TITLES", "#29c7e8"],
                    [formatNumber(recap.totals.completions), "COMPLETIONS", "#8c7cf4"],
                    [formatNumber(recap.totals.repeats), "REPEATS", "#f47d9f"],
                    [`${recap.totals.activeMonths}/12`, "ACTIVE MONTHS", "#f2b84b"],
                ].map(([value, label, color]) =>
                    <div
                        key={label}
                        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}55` }}
                        className="flex h-26 w-57.25 flex-col justify-center rounded-[18px] px-5.5"
                    >
                        <span className="text-[34px] font-bold" style={{ color }}>
                            {value}
                        </span>
                        <span className="mt-1.25 text-[15px] font-bold tracking-[1.5px] text-[#b5bfd0]">
                            {label}
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-8 flex flex-col">
                <span className="text-[18px] font-bold tracking-[3px] text-[#aeb8ca]">
                    THE YEAR IN MOTION
                </span>
                <div className="mt-3.5 flex h-48.5 items-end gap-3.5 rounded-[20px]
                border border-[#ffffff12] bg-[#ffffff0b] px-5 pb-3 pt-4.5">
                    {recap.months.map((month, idx) => {
                        const barHeight = Math.max(month.hours > 0 ? 10 : 3, (month.hours / maximumMonth) * 128);
                        const barColor = recap.scope === "all"
                            ? [STATIC_BRAND_COLOR, "#29c7e8", "#8c7cf4", "#f47d9f", "#f2b84b"][idx % 5]
                            : accent;

                        return (
                            <div key={month.month} className="flex h-39.5 w-16 flex-col items-center justify-end">
                                <div
                                    className="w-9.5 rounded-t-[7px] rounded-b-[3px]"
                                    style={{ height: barHeight, backgroundColor: barColor }}
                                />
                                <span className="mt-2.5 text-[13px] font-bold text-[#9da8ba]">
                                    {monthNames[idx]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {recap.scope === "all"
                ? <div className="mt-7 flex flex-col">
                    <span className="text-[18px] font-bold tracking-[3px] text-[#aeb8ca]">
                        MEDIA MIX
                    </span>
                    <div className="mt-4.25 flex gap-3">
                        {recap.media.map((media) =>
                            <div
                                key={media.mediaType}
                                className="flex min-w-0 flex-1 flex-col rounded-2xl px-4 py-4.5"
                                style={{
                                    backgroundColor: `${getStaticMediaColor(media.mediaType)}18`,
                                    border: `1px solid ${getStaticMediaColor(media.mediaType)}55`,
                                }}
                            >
                                <span className="text-[17px] font-bold" style={{ color: getStaticMediaColor(media.mediaType) }}>
                                    {capitalize(media.mediaType)}
                                </span>
                                <span className="mt-2 text-[25px] font-bold">
                                    {formatPercent(media.share, { fractionDigits: 0 })}
                                </span>
                                <span className="mt-0.75 text-[13px] text-[#aeb8ca]">
                                    {formatHours(media.hours)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                : <div className="mt-7 flex gap-4">
                    <div
                        className="flex flex-1 flex-col rounded-[18px] p-5"
                        style={{
                            backgroundColor: `${accent}18`,
                            border: `1px solid ${accent}55`,
                        }}
                    >
                        <span className="text-[15px] tracking-[2px] text-[#aeb8ca]">
                            FAMOUS TITLE EQUIVALENT
                        </span>
                        <span className="mt-2.5 text-[34px] font-bold" style={{ color: accent }}>
                            {formatNumber(recap.comparison?.referenceCount, { fractionDigits: 1 })}×
                        </span>
                        <span className="mt-1 text-[18px]">
                            {recap.comparison?.referenceLabel}
                        </span>
                    </div>
                    <div className="flex flex-1 flex-col rounded-[18px] border border-[#ffffff16] bg-[#ffffff0b] p-5">
                        <span className="text-[15px] tracking-[2px] text-[#aeb8ca]">
                            ANOTHER WAY TO COUNT IT
                        </span>
                        <span className="mt-2.5 text-[34px] font-bold text-[#f2b84b]">
                            {formatNumber(recap.comparison?.secondaryCount, { fractionDigits: 1 })}
                        </span>
                        <span className="mt-1 text-[18px]">
                            {recap.comparison?.secondaryLabel}
                        </span>
                    </div>
                </div>
            }

            <div className="mt-auto flex items-center justify-between border-t border-[#ffffff16] pt-6">
                <div className="flex flex-col">
                    <span className="text-[18px] font-bold tracking-[2px]">
                        MYLISTS.INFO
                    </span>
                    <span className="mt-1 text-[14px] text-[#9da8ba]">
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
