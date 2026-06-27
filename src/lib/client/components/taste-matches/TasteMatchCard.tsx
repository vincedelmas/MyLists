import {Crown, Star} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Card} from "@/lib/client/components/ui/card";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {TasteMatch} from "@/lib/types/query.options.types";
import {Progress} from "@/lib/client/components/ui/progress";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {FollowButton} from "@/lib/client/components/user-profile/FollowButton";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


export const FeaturedTasteMatch = ({ match, activeTab }: { match: TasteMatch; activeTab: "all" | MediaType }) => {
    return (
        <Card className="border-app-rating/40 bg-linear-to-br from-app-rating/8 via-card to-card p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-center">
                <div className="space-y-6">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-app-rating/40
                    px-3 py-1.5 text-sm font-medium">
                        <Crown className="size-4 text-app-rating"/>{" "}
                        Your closest taste match
                    </div>

                    <UserIdentity
                        match={match}
                        featured={true}
                    />

                    <SharedFavMedia
                        match={match}
                    />

                    <div className="flex flex-wrap gap-3">
                        <FollowButton
                            profileUsername={match.name}
                            social={{ followId: match.id, followStatus: match.followStatus }}
                        />
                        <Button asChild variant="secondary">
                            <Link to="/profile/$username" params={{ username: match.name }}>
                                View profile
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border bg-background/50 p-5">
                    <div className="mb-5 flex flex-col items-center">
                        <MatchScore
                            featured={true}
                            score={match.similarity}
                        />
                        <p className="mt-2 text-sm text-muted-foreground">
                            Overall taste match
                        </p>
                    </div>
                    <MediaScores
                        match={match}
                        activeTab={activeTab}
                    />
                </div>
            </div>
        </Card>
    );
};


export const TasteMatchCard = ({ match, activeTab }: { match: TasteMatch; activeTab: MediaType | "all" }) => {
    return (
        <Card className="h-full justify-between transition-colors hover:border-app-accent/40">
            <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <UserIdentity
                        match={match}
                    />

                    <MatchScore
                        score={match.similarity}
                    />
                </div>

                <MediaScores
                    match={match}
                    activeTab={activeTab}
                />

                <SharedFavMedia
                    match={match}
                />
            </div>

            <div className="flex items-center justify-between gap-3 border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground" title="Total ratings">
                    <Star className="size-4 text-app-rating"/>
                    {formatNumber(match.totalRatings)} rated
                </div>
                <FollowButton
                    className="w-auto"
                    profileUsername={match.name}
                    social={{ followId: match.id, followStatus: match.followStatus }}
                />
            </div>
        </Card>
    );
};


const MatchScore = ({ score, featured = false }: { score: number; featured?: boolean }) => {
    const size = featured ? "size-36" : "size-20";

    return (
        <div className={cn("relative shrink-0", size)} title={`${formatPercent(score, { fractionDigits: 0 })} taste match`}>
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8"/>
                <circle
                    r="42"
                    cx="50"
                    cy="50"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke="var(--app-accent)"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={(2 * Math.PI * 42) * (1 - score / 100)}
                />
            </svg>
            <span className={cn("absolute inset-0 flex items-center justify-center font-bold text-primary", featured ? "text-2xl" : "text-base")}>
                {formatPercent(score, { fractionDigits: 0 })}
            </span>
        </div>
    );
};


const MediaScores = ({ match, activeTab }: { match: TasteMatch; activeTab: MediaType | "all" }) => {
    const displayedTypes = activeTab === "all" ? Object.values(MediaType) : [activeTab];

    return (
        <div className="grid grid-cols-2 gap-x-5 gap-y-2">
            {displayedTypes.map((type) => {
                const score = match.perMedia.find((entry) => entry.mediaType === type);

                return (
                    <div
                        key={type}
                        className="grid grid-cols-[auto_1fr] items-center gap-2"
                        title={score ? `${formatNumber(score.sharedRatings)} shared ratings` : "Not enough shared ratings"}
                    >
                        <MainThemeIcon type={type} size={15}/>
                        <div>
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{capitalize(type)}</span>
                                <span>
                                    {score
                                        ? formatPercent(score.similarity, { fractionDigits: 0 })
                                        : DEFAULT_DASH_FALLBACK
                                    }
                                </span>
                            </div>
                            <Progress
                                color="var(--app-accent)"
                                className="h-1.5 bg-muted"
                                value={score?.similarity ?? 0}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const SharedFavMedia = ({ match }: { match: TasteMatch }) => {
    if (match.lovedMedia.length === 0) return null;

    return (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                You both love
            </p>
            <div className="flex flex-wrap gap-2">
                {match.lovedMedia.map((media) =>
                    <Link
                        to="/details/$mediaType/$mediaId"
                        key={`${media.mediaType}-${media.mediaId}`}
                        params={{ mediaType: media.mediaType, mediaId: media.mediaId }}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1
                        text-xs text-primary transition-colors hover:border-app-accent/50 hover:bg-app-accent/10"
                    >
                        <MainThemeIcon type={media.mediaType} size={13}/>
                        <span className="truncate">{media.name}</span>
                    </Link>
                )}
            </div>
        </div>
    );
};


const UserIdentity = ({ match, featured = false }: { match: TasteMatch; featured?: boolean }) => {
    return (
        <div className="flex items-center gap-4">
            <ProfileIcon
                user={{ name: match.name, image: match.image }}
                fallbackSize={featured ? "text-xl" : "text-base"}
                className={featured ? "size-20 border-2" : "size-14 border-2"}
            />
            <div className="min-w-0">
                <Link
                    to="/profile/$username"
                    params={{ username: match.name }}
                    className={cn(
                        "flex items-center gap-2 truncate font-bold text-primary hover:text-app-accent",
                        featured ? "text-2xl" : "text-base",
                    )}
                >
                    {match.name}
                    <PrivacyIcon
                        type={match.privacy}
                        className="size-3.5"
                    />
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                    {formatNumber(match.sharedRatings)} Shared Ratings
                </p>
            </div>
        </div>
    );
};
