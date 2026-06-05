import {ListOrdered} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {Card} from "@/lib/client/components/ui/card";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {CollectionsDialog} from "@/lib/client/components/media/base/CollectionsDialog";
import {userCollectionMembershipsOptions} from "@/lib/client/react-query/query-options";


interface CollectionsListsProps {
    mediaId: number;
    mediaType: MediaType;
    isAnonymous: boolean;
}


export const CollectionsLists = ({ mediaType, mediaId, isAnonymous }: CollectionsListsProps) => {
    const { data: collections = [] } = useQuery(userCollectionMembershipsOptions(mediaId, mediaType, !isAnonymous));
    const activeCollections = collections.filter((collection) => collection.hasMedia);

    return (
        <Card className="bg-popover p-0 h-fit min-w-0 gap-2">
            <div className="p-4 border-b">
                <h3 className="flex items-center justify-between gap-3 text-primary font-semibold">
                    <span className="flex min-w-0 items-center gap-2">
                        <ListOrdered className="size-5 shrink-0 text-app-accent"/>
                        <span className="truncate">
                            Your Collections ({activeCollections.length})
                        </span>
                    </span>
                    {!isAnonymous &&
                        <CollectionsDialog
                            mediaId={mediaId}
                            mediaType={mediaType}
                        />
                    }
                </h3>
            </div>
            <div className="overflow-y-auto scrollbar-thin max-h-53 space-y-1 px-2 pb-3">
                {
                    isAnonymous ?
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Log-in or register to see your collections.
                        </div>
                        :
                        activeCollections.length === 0 ?
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                Not added to a collection yet.
                            </div>
                            :
                            activeCollections.map((collection) =>
                                <Link
                                    key={collection.id}
                                    to="/collections/$collectionId"
                                    params={{ collectionId: collection.id }}
                                    className="block rounded-lg p-3 transition-colors hover:bg-accent/50"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="truncate text-sm font-medium leading-snug text-primary" title={collection.title}>
                                                {collection.title}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <PrivacyIcon type={collection.privacy}/>
                                    </span>
                                            <span>
                                        {collection.itemsCount} item{collection.itemsCount > 1 ? "s" : ""}
                                    </span>
                                        </div>
                                    </div>
                                </Link>
                            )
                }
            </div>
        </Card>
    );
};
