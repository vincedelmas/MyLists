import {formatDate} from "@/lib/utils/date-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {TrendsMedia} from "@/lib/types/provider.types";
import {MediaCard} from "@/lib/client/components/media/base/MediaCard";


export const TrendCard = ({ media }: { media: TrendsMedia }) => {
    const item = {
        mediaId: media.apiId,
        mediaName: media.displayName,
        imageCover: media.posterPath,
    };

    return (
        <MediaCard item={item} mediaType={media.mediaType} external>
            <div className="absolute bottom-0 w-full space-y-1 rounded-b-sm p-3">
                <div className="flex w-full items-center justify-between space-x-2 max-sm:text-sm">
                    <h3 className="grow truncate font-semibold text-primary" title={media.displayName}>
                        {media.displayName}
                    </h3>
                </div>
                <div className="flex w-full flex-wrap items-center justify-between">
                    <div className="shrink-0 text-xs font-medium text-muted-foreground">
                        {formatDate(media.releaseDate)}
                    </div>
                    <Badge variant="outline" className="shrink-0 backdrop-blur-md capitalize">
                        {media.mediaType}
                    </Badge>
                </div>
            </div>
        </MediaCard>
    );
};
