import {MediaType} from "@/lib/utils/enums";


export const mixedMedia = Object.values(MediaType).map(mediaType => ({
    mediaType,
    id: 501,
    apiId: mediaType === MediaType.BOOKS ? "collection-book-501" : 501,
    name: `Mixed ${mediaType} sentinel`,
}));
