import path from "node:path";
import {serverEnv} from "@/env/server";
import {Renderer} from "takumi-js/node";
import {createRequire} from "node:module";
import {type FontDetails, render} from "takumi-js";
import {capitalize} from "@/lib/utils/formatting/text";
import {getImageFilename} from "@/lib/server/core/images/image-url";
import {type YearRecap, type YearRecapTitle} from "@/lib/types/year-recap.types";
import {formatContinuousTime, formatNumber, formatPercent, zeroPad} from "@/lib/utils/formatting/number";


const WIDTH = 1080;
const HEIGHT = 1350;
const bodyFont = "Open Sans, Noto Sans JP, Noto Emoji";
const displayFont = `Fira Sans Condensed, ${bodyFont}`;
const serifFont = `"Source Serif 4", ${bodyFont}`;

const palettes = {
    all:    { paper: "#eae9d8", ink: "#142c29", line: "#bec7b5", accent: "#a6f1bf" },
    games:  { paper: "#16291e", ink: "#eff4d9", line: "#51604f", accent: "#c9f667" },
    movies: { paper: "#f1e5ce", ink: "#37241c", line: "#bcb19e", accent: "#f2bd69" },
    series: { paper: "#dee9e7", ink: "#203542", line: "#a1b8bb", accent: "#93d8e3" },
    anime:  { paper: "#38201f", ink: "#fff0dc", line: "#79514b", accent: "#ffab91" },
    books:  { paper: "#30233c", ink: "#f5e9f8", line: "#735f7b", accent: "#e2bdf4" },
    manga:  { paper: "#43263b", ink: "#ffedf1", line: "#885f75", accent: "#ffb2d3" },
} as const;

const mediaColors = {
    games: "#255f4f", series: "#84bcc7", movies: "#e7b858",
    anime: "#e99885", books: "#b3a5d7", manga: "#d678a4",
} as const;

const eyebrow = "text-[23px] font-bold tracking-[2px]";
const resolveDependency = createRequire(import.meta.url).resolve;
const fontWeights = [400, 700] as const;
const fontSubsets = ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext", "hebrew", "vietnamese", "symbols", "math"] as const;


const fontSources: (Omit<FontDetails, "data"> & { file: string })[] = [
    { name: "Fira Sans Condensed", weight: 900, file: "@fontsource/fira-sans-condensed/files/fira-sans-condensed-latin-900-normal.woff" },
    { name: "Source Serif 4", weight: 400, file: "@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff" },
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


const yearRecapImageRenderer = Promise.all(fontSources.map(async ({ file, ...font }) => {
    return {
        ...font,
        data: await Bun.file(resolveDependency(file)).arrayBuffer(),
    };
})).then(async (fonts) => {
    const renderer = new Renderer();
    await Promise.all(fonts.map((font) => renderer.registerFont(font)));
    return renderer;
});


const readLeadCover = async (title: YearRecapTitle) => {
    const filename = getImageFilename(title.imageCover);
    if (filename === "default.jpg") return null;

    const cover = Bun.file(path.resolve(serverEnv.BASE_UPLOADS_LOCATION, `${title.mediaType}-covers`, filename));
    if (!await cover.exists()) return null;

    return { src: "recap-lead-cover", data: await cover.arrayBuffer() };
};

type Metric = { value: string; label: string };

function RecapMetrics({ metrics, line }: { metrics: Metric[]; line: string }) {
    return (
        <div className="flex">
            {metrics.map(({ value, label }, index) => (
                <div
                    key={label}
                    className="flex min-w-0 flex-1 flex-col gap-1"
                    style={index > 0 ? { borderLeft: `1px solid ${line}`, paddingLeft: 24 } : undefined}
                >
                    <span
                        className="font-black leading-none"
                        style={{ fontFamily: displayFont, fontSize: value.length > 6 ? 47 : 61, whiteSpace: "nowrap" }}
                    >
                        {value}
                    </span>
                    <span className="text-[19px] font-bold tracking-[1px]">{label}</span>
                </div>
            ))}
        </div>
    );
}

function RecapTitleList({ titles, scope }: {
    titles: YearRecapTitle[];
    scope: YearRecap["scope"];
}) {
    if (!titles.length) return null;

    const palette = palettes[scope];
    const overview = scope === "all";
    const heading = overview ? "TOP TITLES BY MEDIA" : `TOP 5 ${scope.toUpperCase()}`;
    const light = overview || scope === "movies" || scope === "series";

    return (
        <div className="flex flex-col">
            <div className="mb-3 flex items-center justify-between" style={{ color: light ? palette.ink : palette.accent }}>
                <span className={eyebrow}>{heading}</span>
                {overview && <span className="text-[19px] font-bold tracking-[1px]">TRACKED TIME</span>}
            </div>
            {titles.map((title, index) => (
                <div
                    key={`${title.mediaType}-${title.mediaId}`}
                    className="flex h-[63px] items-center gap-4"
                    style={{ borderTop: `1px solid ${palette.line}` }}
                >
                    {overview
                        ? <div className="flex w-[130px] shrink-0 items-center gap-2">
                            <div className="size-3 rounded-full" style={{ backgroundColor: mediaColors[title.mediaType] }}/>
                            <span className="text-[22px] font-bold">{capitalize(title.mediaType)}</span>
                        </div>
                        : <span className="w-10 shrink-0 text-[22px] font-bold">{zeroPad(index + 1)}</span>}
                    <span className="min-w-0 flex-1 line-clamp-2 text-[30px] font-bold leading-none">{title.name}</span>
                    {overview || title.releaseDate
                        ? <span className="shrink-0 text-[23px]">
                            {overview ? formatContinuousTime(title.hours) : title.releaseDate?.slice(0, 4)}
                        </span>
                        : null}
                </div>
            ))}
        </div>
    );
}

function OverviewRecap({ recap, time }: { recap: YearRecap; time: string }) {
    const palette = palettes.all;
    const leadMedia = recap.media[0];
    const hasTime = leadMedia && recap.totals.hours > 0;
    const metrics = [
        { value: time, label: "TRACKED TIME" },
        ...(hasTime ? [{ value: formatNumber(recap.totals.titleCount), label: "TITLES LOGGED" }] : []),
        { value: formatNumber(recap.totals.completions), label: "COMPLETIONS" },
    ];

    return (
        <>
            <div className="relative flex h-[452px] shrink-0 flex-col overflow-hidden px-14 pt-8" style={{ backgroundColor: palette.accent }}>
                {[175, 235, 295, 355, 415, 475, 535, 595].map((radius) => (
                    <div
                        key={radius}
                        className="absolute rounded-full"
                        style={{
                            width: radius * 2, height: radius * 2, right: 120 - radius, bottom: 120 - radius,
                            border: "2px solid #8fd6aa",
                        }}
                    />
                ))}
                <span className={`${eyebrow} relative line-clamp-1`}>{recap.user.name}’s year in media</span>
                <div className="relative mt-5 flex items-baseline">
                    <span className="text-[224px] font-black leading-none tracking-[-7px]" style={{ fontFamily: displayFont }}>
                        {hasTime ? formatNumber(leadMedia.share, { locale: "en", maximumFractionDigits: 0 }) : formatNumber(recap.totals.titleCount)}
                    </span>
                    {hasTime &&
                        <span className="ml-1 text-[142px] font-black leading-none" style={{ fontFamily: displayFont }}>%</span>}
                </div>
                <span className="relative text-[47px] leading-tight" style={{ fontFamily: serifFont }}>
                    {hasTime ? `of tracked time went to ${leadMedia.mediaType}.` : "titles logged this year."}
                </span>
                {hasTime &&
                    <div className="absolute inset-x-0 bottom-0 flex h-[42px]" style={{ backgroundColor: palette.ink }}>
                        {recap.media.map(({ mediaType, share }) => share > 0 &&
                            <div key={mediaType} style={{ flexGrow: share, flexBasis: 0, backgroundColor: mediaColors[mediaType] }}/>
                        )}
                    </div>}
            </div>
            {hasTime &&
                <div className="flex justify-between gap-3 px-14 py-5" style={{ borderBottom: `1px solid ${palette.line}` }}>
                    {recap.media.map(({ mediaType, share }) => (
                        <div key={mediaType} className="flex items-center gap-2">
                            <div className="size-3 rounded-full" style={{ backgroundColor: mediaColors[mediaType] }}/>
                            <span className="text-[21px]">
                                {capitalize(mediaType)} <b>{formatPercent(share, { fractionDigits: 0 })}</b>
                            </span>
                        </div>
                    ))}
                </div>}
            <div className="flex flex-1 flex-col justify-evenly gap-5 px-14 py-5">
                <RecapMetrics metrics={metrics} line={palette.line}/>
                <RecapTitleList titles={recap.topTitlesByMedia} scope="all"/>
            </div>
        </>
    );
}

function CategoryRecap({ recap, scope, time, coverSrc }: {
    recap: YearRecap;
    scope: Exclude<YearRecap["scope"], "all">;
    time: string;
    coverSrc?: string;
}) {
    const palette = palettes[scope];
    const [lead] = recap.topTitles;
    const topFive = recap.topTitles.slice(0, 5);
    const count = formatNumber(recap.totals.titleCount);
    const completions = { value: formatNumber(recap.totals.completions), label: "COMPLETIONS" };
    const logged = scope === "movies" ? "films logged" : scope === "manga" ? "manga titles logged" : `${scope} logged`;
    const hours = { value: time, label: "TRACKED TIME" };
    const wide = scope === "movies" || scope === "series";
    const wideMetrics = [
        hours,
        recap.totals.repeats > 0
            ? { value: formatNumber(recap.totals.repeats), label: "REWATCHES" }
            : completions,
    ];

    if (wide) {
        return (
            <>
                <div className="relative flex h-[500px] shrink-0 flex-col justify-end overflow-hidden px-14 pb-10"
                    style={{ backgroundColor: palette.ink, color: palette.paper }}
                >
                    {coverSrc && <>
                        <img src={coverSrc} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: "center 29%" }}/>
                        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to top, #161014 0%, #161014cc 25%, #16101400 78%)" }}/>
                    </>}
                    <span className={`${eyebrow} relative line-clamp-1`} style={{ color: palette.accent }}>
                        {lead ? `${recap.user.name}’s top ${scope === "movies" ? "film" : "series"}` : recap.user.name}
                    </span>
                    {lead &&
                        <span
                            className="relative mt-2 line-clamp-2 leading-tight"
                            style={{ fontFamily: serifFont, fontSize: coverSrc ? 64 : 100 }}
                        >
                            {lead.name}
                        </span>}
                </div>
                <div className="flex flex-col px-14 pt-8">
                    <div className="mb-9 flex items-center justify-between gap-8">
                        <div className="flex min-w-0 items-baseline gap-4">
                            <span className="text-[156px] font-black leading-none" style={{ fontFamily: displayFont }}>{count}</span>
                            <span className="text-[38px]" style={{ fontFamily: serifFont }}>{logged}</span>
                        </div>
                        <div className="w-[375px] shrink-0"><RecapMetrics metrics={wideMetrics} line={palette.line}/></div>
                    </div>
                    <RecapTitleList titles={topFive} scope={scope}/>
                </div>
            </>
        );
    }

    const reading = scope === "books" || scope === "manga";
    const readingSummary = reading ? recap.media[0] : undefined;
    const activity = readingSummary
        ? {
            value: formatNumber(readingSummary.progress, { locale: "en" }),
            label: `${readingSummary.progressUnit.toUpperCase()} READ`,
        }
        : hours;
    const showTime = !reading && recap.totals.hours > 0;
    const [timeValue, timeUnit] = time.includes(" ") ? time.split(" ") : [time.slice(0, -1), "hours"];
    const heroValue = showTime ? timeValue : count;
    const heroLabel = showTime
        ? `${timeUnit} of tracked ${scope === "games" ? "play" : "watching"}`
        : logged;

    return (
        <div className="flex flex-col gap-10 px-14 pt-10">
            <div className="flex h-[640px] items-start gap-9">
                <div className="flex min-w-0 flex-1 flex-col pt-8">
                    <span className={`${eyebrow} line-clamp-1`} style={{ color: palette.accent }}>{recap.user.name}</span>
                    <span className="mt-9 text-[194px] font-black leading-none tracking-[-5px]"
                        style={{ fontFamily: displayFont, color: palette.accent }}
                    >
                        {heroValue}
                    </span>
                    <span className="mt-2 text-[37px] font-bold leading-tight">{heroLabel}</span>
                    <div className="mt-12 flex flex-col pt-7" style={{ borderTop: `1px solid ${palette.line}` }}>
                        <RecapMetrics metrics={[showTime ? { value: count, label: logged.toUpperCase() } : activity, completions]} line={palette.line}/>
                    </div>
                </div>
                {lead && <div
                    className="flex h-[620px] w-[431px] shrink-0 flex-col p-[10px]"
                    style={{ backgroundColor: palette.accent, transform: "rotate(2deg)", boxShadow: "11px 12px #0005" }}
                >
                    {coverSrc
                        ? <img src={coverSrc} alt="" className="size-full object-cover"/>
                        : <div className="flex size-full flex-col justify-center gap-4 p-7" style={{ backgroundColor: palette.paper }}>
                            <span className={eyebrow} style={{ color: palette.accent }}>TOP TITLE</span>
                            <span className="line-clamp-5 text-[66px] leading-tight" style={{ fontFamily: serifFont }}>{lead.name}</span>
                        </div>}
                </div>}
            </div>
            <RecapTitleList titles={topFive} scope={scope}/>
        </div>
    );
}

export const renderYearRecapImage = async (recap: YearRecap) => {
    const { scope } = recap;
    const palette = palettes[scope];
    const lead = recap.topTitles[0];
    const cover = scope !== "all" && lead ? await readLeadCover(lead) : null;
    const time = formatContinuousTime(recap.totals.hours);
    const scopeLabel = scope === "all" ? "ALL MEDIA" : scope.toUpperCase();
    const wide = scope === "movies" || scope === "series";
    const pixelRatio = scope !== "all" && !wide && lead ? 2 : 1;

    const rendered = await render(
        <div className="flex size-full flex-col" style={{ fontFamily: bodyFont, backgroundColor: palette.paper, color: palette.ink }}>
            <div
                className="flex h-[118px] shrink-0 items-center justify-between px-14"
                style={{
                    backgroundColor: scope === "all" ? palette.accent : wide ? palette.ink : palette.paper,
                    color: wide ? palette.paper : palette.ink,
                    borderBottom: `1px solid ${palette.line}`,
                }}
            >
                <span className="text-[30px] font-bold tracking-[4px]">MYLISTS</span>
                <span className="text-[22px] font-bold tracking-[2px]">{recap.year} YEAR RECAP / {scopeLabel}</span>
            </div>
            {scope === "all"
                ? <OverviewRecap recap={recap} time={time}/>
                : <CategoryRecap recap={recap} scope={scope} time={time} coverSrc={cover?.src}/>}
            <div
                className="mx-14 mt-auto flex h-[95px] shrink-0 items-center"
                style={{ borderTop: `1px solid ${palette.line}` }}
            >
                <span className="text-[21px] font-bold tracking-[2px]">MYLISTS.INFO</span>
            </div>
        </div>,
        {
            width: WIDTH * pixelRatio,
            height: HEIGHT * pixelRatio,
            format: "png",
            devicePixelRatio: pixelRatio,
            emoji: "from-font",
            renderer: await yearRecapImageRenderer,
            images: cover ? [cover] : [],
            jsx: { tailwindClassesProperty: "className" },
        },
    );
    // Downsample the rotated edges to soften stair-stepping at the export resolution.
    const png = pixelRatio > 1
        ? await new Bun.Image(rendered).resize(WIDTH, HEIGHT, { filter: "box" }).png().bytes()
        : rendered;

    return {
        filename: `${recap.user.name}-${recap.year}-${scope === "all" ? "all-media" : scope}-recap.png`,
        dataUrl: `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
    };
};
