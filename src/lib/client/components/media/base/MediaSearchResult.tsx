import {cn} from "@/lib/utils/classnames";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaCardDetails} from "@/lib/client/components/media/base/MediaCard";


interface MediaSearchResultProps {
    isPending?: boolean;
    item: ProviderSearchResult;
}


export const MediaSearchResult = ({ item, isPending = false }: MediaSearchResultProps) => {
    const isUser = item.itemType === ApiProviderType.USERS;

    return (
        <div
            aria-busy={isPending}
            className={cn("flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-muted/30", isPending && "cursor-auto")}
        >
            <div className="relative shrink-0">
                {isUser ?
                    <ProfileIcon
                        fallbackSize="text-lg"
                        user={{ name: item.name, image: item.image }}
                        className={cn("size-14 border-2 transition-opacity duration-200", isPending && "opacity-20")}
                    />
                    :
                    <img
                        loading="lazy"
                        alt={item.name}
                        src={item.image}
                        className={cn("aspect-2/3 w-14 rounded-sm object-cover transition-opacity duration-200", isPending && "opacity-20")}
                    />
                }
                {isPending &&
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Spinner className="size-6"/>
                    </div>
                }
            </div>

            <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 transition-opacity duration-200", isPending && "opacity-40")}>
                <h3 className="line-clamp-2 font-semibold leading-snug">
                    {item.name}
                </h3>
                {isUser ?
                    <span className="text-xs text-muted-foreground">
                        User profile
                    </span>
                    :
                    <MediaCardDetails className="text-xs text-muted-foreground">
                        <MediaReleaseDate date={item.date}/>
                        <MediaTypeText mediaType={item.itemType as MediaType}/>
                    </MediaCardDetails>
                }
            </div>
        </div>
    );
};
