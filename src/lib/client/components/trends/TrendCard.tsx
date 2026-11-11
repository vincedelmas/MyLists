import {TrendsMedia} from "@/lib/types/provider.types";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaCard, MediaCardBadge, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const TrendCard = ({ media }: { media: TrendsMedia }) => {
    const item = {
        mediaId: media.apiId,
        mediaName: media.displayName,
        imageCover: media.posterPath,
    };

    return (
        <MediaCard item={item} mediaType={media.mediaType} external={true}>
            <MediaCardBadge className="capitalize">
                <MediaTypeIcon mediaType={media.mediaType}/>
                {media.mediaType}
            </MediaCardBadge>
            <MediaCardFooter>
                <MediaCardTitle title={media.displayName} className="tracking-tight">
                    {media.displayName}
                </MediaCardTitle>
                <MediaCardMeta>
                    <MediaCardDetails>
                        <MediaReleaseDate date={media.releaseDate}/>
                    </MediaCardDetails>
                </MediaCardMeta>
            </MediaCardFooter>
        </MediaCard>
    );
};
