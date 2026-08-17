import {ReactNode} from "react";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/text-formatting";
import {Link, LinkProps} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {ChevronLeft, ChevronRight, Search} from "lucide-react";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {ApiProviderType, MediaType, PrivacyType} from "@/lib/utils/enums";
import {FollowButton} from "@/lib/client/components/user-profile/FollowButton";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {SearchMediaListIndicator} from "@/lib/client/components/media/base/SearchMediaListIndicator";


interface NavbarSearchResultsProps {
    page: number;
    hasNextPage: boolean;
    currentUserId?: number;
    providerLabel: string;
    onNavigate: () => void;
    items: ProviderSearchResult[];
    onPageChange: (page: number) => void;
}


export const NavbarSearchResults = (props: NavbarSearchResultsProps) => {
    const { page, items, hasNextPage, currentUserId, providerLabel, onNavigate, onPageChange } = props;

    return (
        <div className="flex max-h-[min(32rem,calc(100vh-6rem))] flex-col">
            <div className="flex items-center justify-between border-b bg-muted/25 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-brand">
                        <Search className="size-3.5"/>
                    </span>
                    <span>{providerLabel} results</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                    Page {page}
                </span>
            </div>

            <div role="list" className="flex flex-col gap-1 overflow-y-auto p-2 scrollbar-thin">
                {items.map((item) => item.itemType === ApiProviderType.USERS ?
                    <UserResult
                        item={item}
                        key={item.id}
                        onNavigate={onNavigate}
                        currentUserId={currentUserId}
                    />
                    :
                    <MediaResult
                        item={item}
                        onNavigate={onNavigate}
                        key={`${item.itemType}-${item.id}`}
                    />
                )}
            </div>

            <div className="flex items-center justify-between border-t bg-muted/15 px-3 py-2.5">
                <span className="text-[11px] text-muted-foreground">
                    {currentUserId
                        ? <>Press <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd> for all results</>
                        : "Choose a result to open it"
                    }
                </span>
                <ButtonGroup aria-label="Search result pages">
                    <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => onPageChange(page - 1)}
                        aria-label="Previous search result page"
                    >
                        <ChevronLeft/>
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={!hasNextPage}
                        aria-label="Next search result page"
                        onClick={() => onPageChange(page + 1)}
                    >
                        <ChevronRight/>
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    );
};


interface UserResultProps {
    currentUserId?: number;
    onNavigate: () => void;
    item: ProviderSearchResult;
}


const UserResult = ({ item, currentUserId, onNavigate }: UserResultProps) => {
    const isCurrentUser = currentUserId === Number(item.id);
    const privacy = item.privacy ?? PrivacyType.RESTRICTED;

    return (
        <div role="listitem" className="group/result flex items-center gap-2 rounded-xl border border-transparent p-1.5
        transition-all hover:border-border/70 hover:bg-muted/45">
            <ResultLink item={item} onNavigate={onNavigate}>
                <ProfileIcon
                    fallbackSize="text-sm"
                    user={{ name: item.name, image: item.image }}
                    className="size-12 border-2 shadow-sm transition-transform duration-200 group-hover/result:scale-[1.03]"
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold leading-snug group-hover/result:text-brand">
                        {item.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PrivacyIcon type={privacy}/>
                        <span>{capitalize(privacy)} profile</span>
                        {isCurrentUser &&
                            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[9px]">
                                You
                            </Badge>
                        }
                    </div>
                </div>
            </ResultLink>

            {currentUserId && !isCurrentUser &&
                <FollowButton
                    profileUsername={item.name}
                    className="h-8 w-24 px-2.5 text-xs"
                    social={{
                        followId: Number(item.id),
                        followStatus: item.followStatus ? { status: item.followStatus } : null,
                    }}
                />
            }
        </div>
    );
};


interface MediaResultProps {
    onNavigate: () => void;
    item: ProviderSearchResult;
}


const MediaResult = ({ item, onNavigate }: MediaResultProps) => {
    const mediaType = item.itemType as MediaType;

    return (
        <div role="listitem" className="group/result flex items-center gap-2 rounded-xl border border-transparent p-1.5
        transition-all hover:border-border/70 hover:bg-muted/45">
            <ResultLink item={item} onNavigate={onNavigate}>
                <div className="relative shrink-0 overflow-hidden rounded-md bg-muted shadow-sm">
                    <img
                        loading="lazy"
                        alt={item.name}
                        src={item.image}
                        className="aspect-2/3 w-14 object-cover transition-transform duration-300
                        group-hover/result:scale-105 sm:w-16"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold leading-snug group-hover/result:text-brand">
                        {item.name}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                            <MediaTypeIcon mediaType={mediaType} size={11}/>
                            <MediaTypeText mediaType={mediaType}/>
                        </Badge>
                        <span aria-hidden="true" className="text-border">•</span>
                        <MediaReleaseDate
                            date={item.date}
                            precision="year"
                        />
                    </div>
                </div>
                {item.inCurrentUserList &&
                    <SearchMediaListIndicator mediaName={item.name}/>
                }
            </ResultLink>
        </div>
    );
};


interface ResultLinkProps {
    children: ReactNode;
    onNavigate: () => void;
    item: ProviderSearchResult;
}


const ResultLink = ({ item, onNavigate, children }: ResultLinkProps) => {
    const destination: LinkProps = item.itemType === ApiProviderType.USERS ?
        {
            to: "/profile/$username",
            params: { username: item.name },
        }
        :
        {
            to: "/details/$mediaType/external/$apiId",
            params: { mediaType: item.itemType as MediaType, apiId: item.id.toString() },
        };

    return (
        <Link
            {...destination}
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            {children}
        </Link>
    );
};
