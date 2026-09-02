import {TrendsMedia} from "@/lib/types/provider.types";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const TrendCard = ({ media }: { media: TrendsMedia }) => {
    const item = {
        mediaId: media.apiId,
        mediaName: media.displayName,
        imageCover: media.posterPath,
    };

    return (
        <MediaCard item={item} mediaType={media.mediaType} external={true}>
            <MediaCardFooter>
                <MediaCardTitle title={media.displayName}>
                    {media.displayName}
                </MediaCardTitle>
                <MediaCardMeta>
                    <MediaCardDetails>
                        <span className="flex min-w-0 items-center gap-1.5 capitalize">
                            <MediaTypeIcon mediaType={media.mediaType}/>
                            <span className="truncate">{media.mediaType}</span>
                        </span>
                        <MediaReleaseDate date={media.releaseDate}/>
                    </MediaCardDetails>
                </MediaCardMeta>
            </MediaCardFooter>
        </MediaCard>
    );
};
