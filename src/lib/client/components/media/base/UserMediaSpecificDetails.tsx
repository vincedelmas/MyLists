import {MediaType} from "@/lib/utils/enums";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {ExtractUserMediaByType} from "@/lib/types/query.options.types";
import type {UserMediaProgressDetails} from "@/lib/types/user-media.types";
import {UpdateUserMediaMutationOptions, UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaSpecificDetailsProps<T extends MediaType> {
    mediaType: T;
    queryOption: UserMediaQueryOption;
    media: UserMediaProgressDetails<T>;
    userMedia: ExtractUserMediaByType<T>;
    mutationOptions?: UpdateUserMediaMutationOptions;
}


export const UserMediaSpecificDetails = <T extends MediaType>({ media, mediaType, userMedia, queryOption, mutationOptions }: UserMediaSpecificDetailsProps<T>) => {
    const SpecificDetailsComponent = mediaConfig[mediaType].mediaUserDetails;

    return (
        <SpecificDetailsComponent
            media={media}
            mediaType={mediaType}
            userMedia={userMedia}
            queryOption={queryOption}
            mutationOptions={mutationOptions}
        />
    );
}
