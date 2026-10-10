import {MediaType} from "@/lib/utils/enums";


export const mixedCollection = {
    id: 61,
    title: "Mixed collection browser sentinel",
    description: "A universe across every media type.",
};


export const mixedMedia = Object.values(MediaType).map(mediaType => ({
    mediaType,
    id: 501,
    apiId: mediaType === MediaType.BOOKS ? "collection-book-501" : 501,
    name: `Mixed ${mediaType} sentinel`,
}));
