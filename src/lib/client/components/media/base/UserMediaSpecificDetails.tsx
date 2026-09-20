import {MediaType} from "@/lib/utils/enums";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {ExtractUserMediaByType} from "@/lib/types/query.options.types";
import {UpdateUserMediaMutationOptions, UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaSpecificDetailsProps<T extends MediaType> {
    mediaType: T;
    queryOption: UserMediaQueryOption;
    userMedia: ExtractUserMediaByType<T>;
    mutationOptions?: UpdateUserMediaMutationOptions;
    name?: "mediaUserDetails" | "mediaUserSetup";
}


export const UserMediaSpecificDetails = <T extends MediaType>({ mediaType, userMedia, queryOption, mutationOptions, name = "mediaUserDetails" }: UserMediaSpecificDetailsProps<T>) => {
    const SpecificDetailsComponent = mediaConfig[mediaType][name];
    if (!SpecificDetailsComponent) return null;

    return (
        <SpecificDetailsComponent
            mediaType={mediaType}
            userMedia={userMedia}
            queryOption={queryOption}
            mutationOptions={mutationOptions}
        />
    );
}
