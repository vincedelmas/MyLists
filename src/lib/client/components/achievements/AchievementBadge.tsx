import {useId} from "react";
import {cn} from "@/lib/utils/classnames";
import {AchievementCategory} from "@/lib/utils/enums";
import {getAchievementRarityTier} from "@/lib/utils/achievements";
import {ACHIEVEMENT_CATEGORY_PALETTE, ACHIEVEMENT_ICON_MAP} from "@/lib/client/components/achievements/achievement-icons";
import type {AchievementBadgePattern, AchievementBadgeShape, AchievementIconKey} from "@/lib/types/achievements.types";


interface AchievementBadgeProps {
    icon: AchievementIconKey;
    shape: AchievementBadgeShape;
    pattern: AchievementBadgePattern;
    category: AchievementCategory;
    rarity?: number | null;
    unlocked?: boolean;
    hidden?: boolean;
    size?: "xs" | "sm" | "md" | "lg";
    className?: string;
}


const SIZE_CLASSES = {
    xs: { box: "size-10", icon: "size-4.5", diamondIcon: "size-3.5" },
    sm: { box: "size-12", icon: "size-5.5", diamondIcon: "size-4.5" },
    md: { box: "size-14", icon: "size-6.5", diamondIcon: "size-5" },
    lg: { box: "size-18", icon: "size-8.5", diamondIcon: "size-6.5" },
} as const;


const RAYS = Array.from({ length: 12 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 12;
    return {
        x2: Number((40 + 38 * Math.cos(angle)).toFixed(1)),
        y2: Number((40 + 38 * Math.sin(angle)).toFixed(1)),
    };
});


const DOTS = [16, 28, 40, 52, 64].flatMap((x) =>
    [16, 28, 40, 52, 64].map((y) => ({ x, y }))
);


function polygonPoints(sides: number, radius: number, offsetAngle: number) {
    return Array.from({ length: sides }, (_, i) => {
        const angle = ((Math.PI * 2) / sides) * i + offsetAngle;
        return `${(40 + radius * Math.cos(angle)).toFixed(1)},${(40 + radius * Math.sin(angle)).toFixed(1)}`;
    }).join(" ");
}


const HEX_POINTS = {
    outer: polygonPoints(6, 36, -Math.PI / 2),
    clip: polygonPoints(6, 32, -Math.PI / 2),
    inner: polygonPoints(6, 31.5, -Math.PI / 2),
};


const OCTAGON_POINTS = {
    outer: polygonPoints(8, 36, Math.PI / 8),
    clip: polygonPoints(8, 32, Math.PI / 8),
    inner: polygonPoints(8, 31.5, Math.PI / 8),
};


const SHIELD_PATHS = {
    outer: "M40 5 L69 15 V40 C69 57 56 69 40 75 C24 69 11 57 11 40 V15 Z",
    inner: "M40 10.5 L63.5 18.8 V39.5 C63.5 53.5 52.8 63.6 40 68.8 C27.2 63.6 16.5 53.5 16.5 39.5 V18.8 Z",
};


function BadgeFramePath({ shape, variant = "outer" }: { shape: AchievementBadgeShape; variant?: "outer" | "clip" | "inner" }) {
    if (shape === "circle") {
        const r = variant === "outer" ? 35 : variant === "clip" ? 31 : 30.5;
        return <circle cx="40" cy="40" r={r}/>;
    }
    if (shape === "hex") {
        return <polygon points={HEX_POINTS[variant]} strokeLinejoin="round"/>;
    }
    if (shape === "octagon") {
        return <polygon points={OCTAGON_POINTS[variant]} strokeLinejoin="round"/>;
    }
    if (shape === "shield") {
        return <path d={variant === "outer" ? SHIELD_PATHS.outer : SHIELD_PATHS.inner} strokeLinejoin="round"/>;
    }
    const o = variant === "outer" ? 4 : variant === "clip" ? 8 : 8.5;
    return <polygon points={`40,${o} ${80 - o},40 40,${80 - o} ${o},40`} strokeLinejoin="round"/>;
}


export function AchievementBadge({
    icon,
    shape,
    pattern,
    category,
    rarity = null,
    unlocked = true,
    hidden = false,
    size = "md",
    className,
}: AchievementBadgeProps) {
    const uid = useId().replace(/:/g, "");
    const palette = ACHIEVEMENT_CATEGORY_PALETTE[category];
    const tier = unlocked ? getAchievementRarityTier(rarity) : "common";
    const isRare = unlocked && tier === "rare";
    const isUltra = unlocked && tier === "ultra";

    const IconComponent = ACHIEVEMENT_ICON_MAP[hidden ? "question" : icon];
    const sizeSpec = SIZE_CLASSES[size];

    const iconColor = !unlocked
        ? "#52525b"
        : isUltra
            ? "#f0f9ff"
            : isRare
                ? "#fff6d6"
                : palette.accent;

    return (
        <div
            className={cn(
                "relative inline-grid shrink-0 place-items-center select-none",
                !unlocked && "opacity-60",
                sizeSpec.box,
                className,
            )}
        >
            <svg
                viewBox="0 0 80 80"
                aria-hidden="true"
                className={cn(
                    "size-full overflow-visible",
                    isUltra && "drop-shadow-[0_0_6px_rgba(186,230,253,0.45)]",
                    isRare && "drop-shadow-[0_0_5px_rgba(234,185,73,0.38)]",
                )}
            >
                <defs>
                    {isUltra ? (
                        <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff"/>
                            <stop offset="30%" stopColor="#bae6fd"/>
                            <stop offset="68%" stopColor="#c7d2fe"/>
                            <stop offset="100%" stopColor="#7dd3fc"/>
                        </linearGradient>
                    ) : isRare ? (
                        <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fff0a8"/>
                            <stop offset="45%" stopColor="#eab949"/>
                            <stop offset="100%" stopColor="#946519"/>
                        </linearGradient>
                    ) : !unlocked ? (
                        <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3c3c42"/>
                            <stop offset="100%" stopColor="#232327"/>
                        </linearGradient>
                    ) : (
                        <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={palette.accent} stopOpacity="0.92"/>
                            <stop offset="100%" stopColor={palette.deep}/>
                        </linearGradient>
                    )}

                    {!unlocked ? (
                        <radialGradient id={`bg-${uid}`} cx="50%" cy="40%" r="70%">
                            <stop offset="0%" stopColor="#1e1e22"/>
                            <stop offset="100%" stopColor="#111114"/>
                        </radialGradient>
                    ) : isUltra ? (
                        <radialGradient id={`bg-${uid}`} cx="32%" cy="20%" r="80%">
                            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.34"/>
                            <stop offset="42%" stopColor="#1e293b" stopOpacity="0.94"/>
                            <stop offset="100%" stopColor="#090d16"/>
                        </radialGradient>
                    ) : (
                        <radialGradient id={`bg-${uid}`} cx="35%" cy="22%" r="78%">
                            <stop offset="0%" stopColor={palette.accent} stopOpacity="0.38"/>
                            <stop offset="56%" stopColor={palette.deep} stopOpacity="0.92"/>
                            <stop offset="100%" stopColor="#0d0e11"/>
                        </radialGradient>
                    )}

                    <clipPath id={`clip-${uid}`}>
                        <BadgeFramePath shape={shape} variant="clip"/>
                    </clipPath>
                </defs>

                <g
                    fill={`url(#bg-${uid})`}
                    stroke={`url(#rim-${uid})`}
                    strokeWidth={isRare || isUltra ? 3.2 : unlocked ? 2.5 : 1.8}
                >
                    <BadgeFramePath shape={shape} variant="outer"/>
                </g>

                {unlocked && (
                    <g clipPath={`url(#clip-${uid})`}>
                        {pattern === "rings" && (
                            <>
                                <circle cx="40" cy="40" r="16" fill="none" stroke={isUltra ? "#bae6fd" : palette.accent} strokeOpacity="0.18" strokeWidth="1"/>
                                <circle cx="40" cy="40" r="24" fill="none" stroke={isUltra ? "#bae6fd" : palette.accent} strokeOpacity="0.12" strokeWidth="1"/>
                            </>
                        )}
                        {pattern === "rays" && RAYS.map((ray, index) => (
                            <line
                                key={index}
                                x1="40"
                                y1="40"
                                x2={ray.x2}
                                y2={ray.y2}
                                stroke={isUltra ? "#bae6fd" : palette.accent}
                                strokeOpacity={isUltra ? "0.18" : "0.14"}
                                strokeWidth="2"
                            />
                        ))}
                        {pattern === "dots" && DOTS.map((dot, index) => (
                            <circle
                                key={index}
                                cx={dot.x}
                                cy={dot.y}
                                r="1.2"
                                fill={isUltra ? "#bae6fd" : palette.accent}
                                fillOpacity="0.2"
                            />
                        ))}
                        <ellipse cx="40" cy="14" rx="26" ry="12" fill="#ffffff" opacity={isUltra ? "0.18" : "0.11"}/>
                    </g>
                )}

                {unlocked && (
                    <g fill="none" stroke={isUltra ? "#e0f2fe" : "#ffffff"} strokeOpacity={isUltra ? 0.34 : isRare ? 0.24 : 0.14} strokeWidth="1">
                        <BadgeFramePath shape={shape} variant="inner"/>
                    </g>
                )}

                {isUltra && (
                    <polygon points="40,7.5 43.8,12 40,16.5 36.2,12" fill="#e0f2fe" stroke="#ffffff" strokeWidth="0.6" opacity="0.96"/>
                )}
                {isRare && (
                    <circle cx="40" cy="11" r="2" fill="#fff2b2" opacity="0.95"/>
                )}
            </svg>

            <span
                aria-hidden="true"
                className={cn(
                    "pointer-events-none absolute inset-0 grid place-items-center",
                    shape === "shield" && "-translate-y-0.5",
                    unlocked && "drop-shadow-[0_2px_3px_rgba(0,0,0,0.72)]",
                )}
                style={{ color: iconColor }}
            >
                <IconComponent className={shape === "diamond" ? sizeSpec.diamondIcon : sizeSpec.icon}/>
            </span>
        </div>
    );
}
