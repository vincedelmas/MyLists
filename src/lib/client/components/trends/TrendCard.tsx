import {TrendsMedia} from "@/lib/types/provider.types";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardTitle, MediaCardType} from "@/lib/client/components/media/base/MediaCard";


export const TrendCard = ({ media }: { media: TrendsMedia }) => {
    const item = {
        mediaId: media.apiId,
        mediaName: media.displayName,
        imageCover: media.posterPath,
    };

    return (
        <MediaCard item={item} mediaType={media.mediaType} external={true}>
            <MediaCardType mediaType={media.mediaType}/>
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
