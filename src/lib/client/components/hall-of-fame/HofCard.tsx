import {Trophy} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatLevel} from "@/lib/utils/number-formatting";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {HofUserData} from "@/lib/types/query.options.types";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";


interface HofCardProps {
    userData: HofUserData;
}


export const HofCard = ({ userData }: HofCardProps) => {
    const { currentUser } = useAuth();
    const isCurrentUser = currentUser?.id === userData.id;

    return (
        <article
            aria-current={isCurrentUser ? "true" : undefined}
            className={cn(
                "grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-2 border-b px-1 py-2.5 " +
                "last:border-b-0 md:grid-cols-[2.5rem_minmax(8rem,0.7fr)_5rem_minmax(14rem,1.3fr)]",
                userData.rank === 1 && "bg-gold/5 hover:bg-gold/10",
                isCurrentUser && "bg-primary/5",
            )}
        >
            <div className={cn(
                "mx-auto flex size-7 items-center justify-center rounded-full text-sm font-semibold text-muted-foreground",
                userData.rank === 1 && "bg-gold/15 text-gold",
                userData.rank === 2 && "bg-silver/15 text-silver",
                userData.rank === 3 && "bg-bronze/15 text-bronze",
            )}>
                {userData.rank && userData.rank <= 3
                    ?
                    <>
                        <Trophy className="size-3.5" aria-hidden="true"/>
                        <span className="sr-only">
                            Rank {userData.rank}
                        </span>
                    </>
                    :
                    userData.rank ?? <>{DEFAULT_DASH_FALLBACK}</>
                }
            </div>

            <div className="flex min-w-0 items-center gap-2.5">
                <ProfileIcon
                    fallbackSize="text-xs"
                    className="size-9 shrink-0 border shadow-none"
                    user={{ image: userData.image, name: userData.name }}
                />
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                        <Link
                            to="/profile/$username"
                            params={{ username: userData.name }}
                            className="min-w-0 truncate font-medium hover:text-brand"
                        >
                            {userData.name}
                        </Link>
                        <PrivacyIcon className="shrink-0" type={userData.privacy}/>
                        {isCurrentUser &&
                            <Badge className="shrink-0" variant="secondary">
                                You
                            </Badge>
                        }
                    </div>
                </div>
            </div>

            <div className="text-right font-semibold tabular-nums">
                {Math.floor(formatLevel(userData.totalTime))}
            </div>

            <div
                className="col-span-2 col-start-2 mt-1 grid grid-cols-3 gap-x-3 gap-y-1.5 border-t pt-2.5 md:col-span-1 md:col-start-auto
                md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-8">
                {ALL_MEDIA_TYPES.map((mediaType) => {
                    const setting = userData.settings.find((item) => item.mediaType === mediaType);

                    return (
                        <Link
                            key={mediaType}
                            disabled={!setting?.active}
                            to="/list/$mediaType/$username"
                            params={{ mediaType, username: userData.name }}
                            className={cn("group/media flex min-w-0 items-center gap-2", !setting?.active && "pointer-events-none opacity-40")}
                        >
                            <MediaTypeIcon mediaType={mediaType} size={13}/>
                            <span className="min-w-0">
                                <span className="block truncate text-[10px] capitalize text-muted-foreground group-hover/media:text-foreground">
                                    {mediaType}
                                </span>
                                <span className="block text-sm font-semibold tabular-nums">
                                    {setting?.active ? Math.floor(formatLevel(setting.timeSpent)) : "—"}
                                </span>
                            </span>
                        </Link>
                    );
                })}
            </div>
        </article>
    );
};
