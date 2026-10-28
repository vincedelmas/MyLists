import {MediaType} from "@/lib/utils/enums";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import type {MediaUserDetailsProps} from "@/lib/client/components/media/media-config.types";


export const UserMediaSpecificDetails = <T extends MediaType>({ mediaType, userMedia, media, mutationOptions }: MediaUserDetailsProps<T>) => {
    const SpecificDetailsComponent = mediaConfig[mediaType].mediaUserDetails;

    return (
        <SpecificDetailsComponent
            media={media}
            mediaType={mediaType}
            userMedia={userMedia}
            mutationOptions={mutationOptions}
        />
    );
}
