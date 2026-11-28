import {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {AchCard} from "@/lib/types/query.options.types";
import {Progress} from "@/lib/client/components/ui/progress";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {AchievementBadge} from "@/lib/client/components/achievements/AchievementBadge";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {Check, ChevronLeft, ChevronRight, Eye, EyeOff, Gem, Pin, Star, Users} from "lucide-react";
import {ACHIEVEMENT_CATEGORY_PALETTE} from "@/lib/client/components/achievements/achievement-icons";
import {
    ACHIEVEMENT_CATEGORY_LABELS,
    formatAchievementCount,
    formatAchievementRemaining,
    getAchievementRarityTier,
    RARITY_MIN_LEVEL,
} from "@/lib/utils/achievements";


interface AchievementCardProps {
    isOwner: boolean;
    isPinned: boolean;
    achievement: AchCard;
    pinPending?: boolean;
    compareMode: boolean;
    highlighted?: boolean;
    showCategory?: boolean;
    canMovePrev?: boolean;
    canMoveNext?: boolean;
    revealAllSecrets: boolean;
    onTogglePin?: (codeName: string) => void;
    onMovePin?: (direction: "prev" | "next") => void;
}


export const AchievementCard = (props: AchievementCardProps) => {
    const {
        achievement, isOwner, isPinned, pinPending = false, highlighted = false, compareMode,
        showCategory = false, canMovePrev = false, canMoveNext = false, revealAllSecrets, onTogglePin, onMovePin,
    } = props;

    const [revealed, setRevealed] = useState(revealAllSecrets);
    const [prevRevealAll, setPrevRevealAll] = useState(revealAllSecrets);

    if (revealAllSecrets !== prevRevealAll) {
        setPrevRevealAll(revealAllSecrets);
        setRevealed(revealAllSecrets);
    }

    const {
        name, description, category, icon, shape, pattern, secret, target,
        rarity, count, progress, completed, completedAt, metadata, viewerProgress,
    } = achievement;

    const rarityTier = getAchievementRarityTier(rarity);
    const palette = ACHIEVEMENT_CATEGORY_PALETTE[category];

    const isRare = completed && rarityTier === "rare";
    const isUltra = completed && rarityTier === "ultra";
    const isRedacted = secret && !completed && !revealed;

    const displayCount = formatAchievementCount(count);
    const remaining = Math.max(0, Math.ceil(target - count));

    return (
        <article
            id={`ach-${achievement.codeName}`}
            className={cn("relative flex h-full min-w-0 scroll-mt-24 items-start gap-3.5 overflow-hidden rounded-xl " +
                "border p-3.5 transition-all duration-300",
                completed ? "bg-card border-foreground/12 hover:border-foreground/22" : "bg-background/40 border-border/65 hover:border-border",
                isUltra && "achievement-shimmer-hover achievement-shimmer-ultra border-platinum/55 bg-linear-to-br from-platinum/12 via-card to-card hover:border-platinum/80",
                isRare && "achievement-shimmer-hover border-gold/45 bg-linear-to-br from-gold/8 via-card to-card hover:border-gold/65",
                highlighted && "border-brand ring-2 ring-brand/60",
            )}
        >
            <AchievementBadge
                size="md"
                icon={icon}
                shape={shape}
                rarity={rarity}
                pattern={pattern}
                className="mt-0.5"
                category={category}
                hidden={isRedacted}
                unlocked={completed}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3
                                title={isRedacted ? "Hidden achievement" : name}
                                className={cn("truncate text-sm font-semibold tracking-tight",
                                    completed ? "text-foreground" : "text-foreground/80")}
                            >
                                {isRedacted ? "Hidden Achievement" : name}
                            </h3>
                            {secret &&
                                <span className="shrink-0 rounded border border-fuchsia-500/35 bg-fuchsia-500/10 px-1.5 py-px text-[9.5px]
                                font-semibold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
                                    Secret
                                </span>
                            }
                        </div>
                        {showCategory &&
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span
                                    className="size-1.5 rounded-full"
                                    style={{ backgroundColor: palette.accent }}
                                />
                                <span>
                                    {ACHIEVEMENT_CATEGORY_LABELS[category]}
                                </span>
                            </div>
                        }
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        {isOwner && isPinned && onMovePin &&
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    disabled={pinPending || !canMovePrev}
                                    onClick={() => onMovePin("prev")}
                                    aria-label={`Move ${name} earlier in showcase`}
                                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                                >
                                    <ChevronLeft className="size-3.5"/>
                                </button>
                                <button
                                    type="button"
                                    disabled={pinPending || !canMoveNext}
                                    onClick={() => onMovePin("next")}
                                    aria-label={`Move ${name} later in showcase`}
                                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                                >
                                    <ChevronRight className="size-3.5"/>
                                </button>
                            </div>
                        }

                        {isOwner && completed && onTogglePin &&
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <button
                                            type="button"
                                            disabled={pinPending}
                                            onClick={() => onTogglePin(achievement.codeName)}
                                            aria-label={isPinned ? `Unpin ${name} from profile` : `Pin ${name} to profile`}
                                            className={cn("rounded-md p-1 transition-colors", isPinned
                                                ? "bg-brand/15 text-brand hover:bg-brand/25"
                                                : "text-muted-foreground/60 hover:bg-muted hover:text-foreground",
                                            )}
                                        />
                                    }
                                >
                                    <Pin className={cn("size-3.5", isPinned && "fill-current")}/>
                                </TooltipTrigger>
                                <TooltipContent variant="popover">
                                    {isPinned
                                        ? "Pinned on profile"
                                        : "Pin to profile showcase"
                                    }
                                </TooltipContent>
                            </Tooltip>
                        }

                        <RarityPill
                            rarity={rarity}
                            unlocked={completed}
                        />
                    </div>
                </div>

                <p className={cn("mt-1 text-xs leading-relaxed", completed ? "text-muted-foreground" : "text-muted-foreground/75")}>
                    {isRedacted
                        ? "Details for this achievement are hidden until unlocked."
                        : description
                    }
                </p>

                <div className="mt-auto pt-2.5">
                    {completed ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                            {metadata?.label ?
                                <span
                                    title={metadata.label}
                                    className="inline-flex max-w-[68%] items-center gap-1.5 truncate rounded-md border border-border/80
                                    bg-background/60 px-2 py-0.5 font-medium text-foreground"
                                >
                                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: palette.accent }}/>
                                    <span className="truncate">
                                        {metadata.label}
                                    </span>
                                </span>
                                :
                                <span className="inline-flex items-center gap-1 font-medium text-achievement">
                                    <Check className="size-3"/>
                                    Unlocked
                                </span>
                            }
                            <RelativeTime
                                date={completedAt}
                                className="shrink-0 text-[11px] text-muted-foreground/85"
                            />
                        </div>
                    ) : secret ? (
                        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setRevealed((prev) => !prev)}
                                className="inline-flex items-center gap-1.5 font-medium text-fuchsia-600 transition-opacity
                                hover:opacity-80 dark:text-fuchsia-400"
                            >
                                {isRedacted
                                    ? <><Eye className="size-3.5"/> Reveal spoiler</>
                                    : <><EyeOff className="size-3.5"/> Hide spoiler</>
                                }
                            </button>
                            <span className="text-muted-foreground/75">
                                Locked
                            </span>
                        </div>
                    ) : target > 1 ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <Progress
                                    value={progress}
                                    color={palette.accent}
                                    className="min-w-0 flex-1"
                                    aria-label={`${name} progress`}
                                />
                                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground/85">
                                    {displayCount}/{formatNumber(target)}
                                </span>
                            </div>
                            {(metadata?.label || progress >= 75) &&
                                <div className="truncate text-[11px] text-muted-foreground">
                                    {metadata?.label
                                        ? `${metadata.label} · ${formatAchievementRemaining(achievement.codeName, remaining)} to go`
                                        : `Almost there · ${formatAchievementRemaining(achievement.codeName, remaining)} to go`
                                    }
                                </div>
                            }
                        </div>
                    ) : (
                        <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground/75">
                            <span>Locked</span>
                            <span className="tabular-nums">
                                0/1
                            </span>
                        </div>
                    )}

                    {compareMode && viewerProgress &&
                        <div className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2 text-[11px]">
                            <Users className="size-3 text-muted-foreground"/>
                            {completed && viewerProgress.completed ?
                                <span className="font-medium text-brand">
                                    Both unlocked
                                </span>
                                : viewerProgress.completed ?
                                    <span className="font-medium text-info">
                                        You unlocked this
                                    </span>
                                    : completed ?
                                        <span className="text-muted-foreground">
                                            Not yet unlocked by you
                                            {target > 1 ? ` (${formatAchievementCount(viewerProgress.count)}/${formatNumber(target)})` : ""}
                                            </span>
                                        :
                                        <span className="text-muted-foreground tabular-nums">
                                            You: {formatAchievementCount(viewerProgress.count)}/{formatNumber(target)}
                                        </span>
                            }
                        </div>
                    }
                </div>
            </div>
        </article>
    );
};


function RarityPill({ rarity, unlocked }: { rarity: number | null; unlocked: boolean }) {
    const hasRarity = rarity !== null && rarity > 0;
    if (!hasRarity && !unlocked) return null;

    const tier = getAchievementRarityTier(rarity);
    const label = hasRarity ? formatPercent(rarity) : "New";

    return (
        <span
            title={hasRarity ? `${label} of active users (Lvl ${RARITY_MIN_LEVEL}+) unlocked this` : "Recently unlocked, rarity updates daily"}
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums",
                tier === "ultra" && unlocked && hasRarity
                    ? "border-platinum/55 bg-platinum/12 text-platinum"
                    : tier === "rare" && unlocked && hasRarity
                        ? "border-gold/55 bg-gold/12 text-gold"
                        : "border-border/80 bg-muted/60 text-muted-foreground",
            )}
        >
            {tier === "ultra" && hasRarity &&
                <Gem className="size-2.5"/>
            }

            {tier === "rare" && hasRarity &&
                <Star className="size-2.5 fill-current"/>
            }

            {label}
        </span>
    );
}
