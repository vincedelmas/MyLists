export type MediaSortKey = keyof typeof MEDIA_SORT_DEFINITIONS;
export type MediaSortField = typeof MEDIA_SORT_DEFINITIONS[MediaSortKey]["field"];


export const MEDIA_SORT_DEFINITIONS = {
    title_asc: {
        field: "title",
        personal: false,
        direction: "asc",
        label: "Title A-Z",
    },
    title_desc: {
        field: "title",
        personal: false,
        direction: "desc",
        label: "Title Z-A",
    },
    rating_highest: {
        personal: true,
        field: "rating",
        label: "Rating +",
        direction: "desc",
    },
    rating_lowest: {
        personal: true,
        field: "rating",
        direction: "asc",
        label: "Rating -",
    },
    provider_rating_highest: {
        personal: false,
        direction: "desc",
        field: "providerRating",
        label: "Community Rating +",
    },
    provider_rating_lowest: {
        personal: false,
        direction: "asc",
        field: "providerRating",
        label: "Community Rating -",
    },
    release_newest: {
        personal: false,
        direction: "desc",
        field: "releaseDate",
        label: "Release Date +",
    },
    release_oldest: {
        personal: false,
        direction: "asc",
        field: "releaseDate",
        label: "Release Date -",
    },
    added_newest: {
        personal: true,
        field: "addedAt",
        direction: "desc",
        label: "Recently Added",
    },
    added_oldest: {
        personal: true,
        field: "addedAt",
        direction: "asc",
        label: "Added First",
    },
    modified_newest: {
        personal: true,
        direction: "desc",
        field: "lastUpdated",
        label: "Recently Modified",
    },
    modified_oldest: {
        personal: true,
        direction: "asc",
        field: "lastUpdated",
        label: "Modified First",
    },
    redo_highest: {
        field: "redo",
        personal: true,
        direction: "desc",
        label: "Re-experienced",
    },
    pages_highest: {
        field: "pages",
        personal: false,
        label: "Pages +",
        direction: "desc",
    },
    pages_lowest: {
        field: "pages",
        personal: false,
        direction: "asc",
        label: "Pages -",
    },
    chapters_highest: {
        personal: false,
        direction: "desc",
        field: "chapters",
        label: "Chapters +",
    },
    chapters_lowest: {
        personal: false,
        direction: "asc",
        field: "chapters",
        label: "Chapters -",
    },
    playtime_highest: {
        personal: true,
        direction: "desc",
        field: "playtime",
        label: "Playtime +",
    },
    playtime_lowest: {
        personal: true,
        direction: "asc",
        field: "playtime",
        label: "Playtime -",
    },
} as const;


export const MEDIA_SORT_FIELD_LABELS = {
    title: "Title",
    rating: "Rating",
    addedAt: "Date Added",
    lastUpdated: "Last Modified",
    releaseDate: "Release Date",
    providerRating: "Community Rating",
    redo: "Re-experienced",
    playtime: "Playtime",
    pages: "Pages",
    chapters: "Chapters",
} satisfies Record<MediaSortField, string>;


export const MEDIA_SORT_KEYS = Object.keys(MEDIA_SORT_DEFINITIONS) as MediaSortKey[];


export const MEDIA_CATALOG_SORT_KEYS = MEDIA_SORT_KEYS.filter(key => !MEDIA_SORT_DEFINITIONS[key].personal);
