import {AchievementDifficulty, MediaType, RatingSystemType, Status, UpdateType} from "@/lib/utils/enums";
import type {HighlightedMediaResolvedSettings, ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import type {
    AchievementsType,
    ExtractListByType,
    MediaGlobalSummaryType,
    PerMediaSummaryType,
    UserUpdateType
} from "@/lib/types/query.options.types";


export const ONBOARDING_MOVIE_ID = -101;

export const ONBOARDING_PROFILE_NAME = "Alex";


const onboardingCover = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
        <rect width="300" height="450" fill="#18242c"/>
        <rect x="16" y="16" width="268" height="418" rx="10" fill="none" stroke="#34454d"/>
        <g fill="none" stroke="#7db9a7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="142" cy="193" r="4"/>
            <path d="m127 222 13-13 10 10 10-15 13 18"/>
            <rect x="126" y="177" width="48" height="58" rx="5"/>
        </g>
        <text x="150" y="264" text-anchor="middle" font-family="sans-serif" font-size="15" letter-spacing="1" fill="#d9e6e2">
            COVER PREVIEW
        </text>
    </svg>
`)}`;


const highlighted = (items: ResolvedHighlightedMediaTabConfig["items"] = []): ResolvedHighlightedMediaTabConfig => ({
    items,
    mode: "curated",
    title: "A few favorites",
});


const highlightedItems = [
    {
        releaseDate: "2014",
        mediaName: "Interstellar",
        mediaCover: onboardingCover,
        mediaType: MediaType.MOVIES,
        mediaId: ONBOARDING_MOVIE_ID,
    },
    {
        mediaId: -102,
        releaseDate: "2002",
        mediaType: MediaType.MOVIES,
        mediaCover: onboardingCover,
        mediaName: "The Lord of the Rings: The Two Towers",
    },
    {
        mediaId: -103,
        releaseDate: "2017",
        mediaName: "13 Reasons Why",
        mediaType: MediaType.SERIES,
        mediaCover: onboardingCover,
    },
    {
        mediaId: -104,
        releaseDate: "2017",
        mediaType: MediaType.BOOKS,
        mediaCover: onboardingCover,
        mediaName: "Journal d'un AssaSynth",
    },
];


const highlightedMedia = {
    overview: highlighted(highlightedItems),
    [MediaType.MOVIES]: highlighted(highlightedItems.filter((item) => item.mediaType === MediaType.MOVIES)),
    [MediaType.SERIES]: highlighted(highlightedItems.filter((item) => item.mediaType === MediaType.SERIES)),
    [MediaType.BOOKS]: highlighted(highlightedItems.filter((item) => item.mediaType === MediaType.BOOKS)),
    [MediaType.ANIME]: highlighted(),
    [MediaType.GAMES]: highlighted(),
    [MediaType.MANGA]: highlighted(),
} satisfies HighlightedMediaResolvedSettings;


const perMediaSummary = [
    {
        mediaType: MediaType.SERIES,
        noData: false,
        avgRated: 8.2,
        timeSpent: 140,
        totalNoPlan: 17,
        totalEntries: 25,
        entriesRated: 15,
        totalSpecific: 612,
        entriesFavorites: 6,
        timeSpentDays: 140 / 24,
        percentRated: (15 / 17) * 100,
        statusList: [
            { status: Status.COMPLETED, count: 14, percent: 56 },
            { status: Status.WATCHING, count: 3, percent: 12 },
            { status: Status.PLAN_TO_WATCH, count: 8, percent: 32 },
        ],
    },
    {
        mediaType: MediaType.MOVIES,
        noData: false,
        avgRated: 7.8,
        totalNoPlan: 35,
        totalEntries: 48,
        entriesRated: 31,
        totalSpecific: 39,
        entriesFavorites: 9,
        timeSpent: 6200 / 60,
        timeSpentDays: 6200 / 1440,
        percentRated: (31 / 35) * 100,
        statusList: [
            { status: Status.COMPLETED, count: 35, percent: 72.92 },
            { status: Status.PLAN_TO_WATCH, count: 13, percent: 27.08 },
        ],
    },
    {
        mediaType: MediaType.BOOKS,
        avgRated: 8.6,
        noData: false,
        totalNoPlan: 11,
        totalEntries: 15,
        entriesRated: 10,
        totalSpecific: 3240,
        entriesFavorites: 4,
        timeSpent: 3200 / 60,
        timeSpentDays: 3200 / 1440,
        percentRated: (10 / 11) * 100,
        statusList: [
            { status: Status.COMPLETED, count: 9, percent: 60 },
            { status: Status.READING, count: 2, percent: 13.33 },
            { status: Status.PLAN_TO_READ, count: 4, percent: 26.67 },
        ],
    },
] satisfies PerMediaSummaryType;


const mediaGlobalSummary = {
    avgRated: 8.08,
    totalRedo: 7,
    totalRated: 56,
    avgComments: 5,
    totalEntries: 88,
    totalComments: 15,
    totalFavorites: 19,
    avgFavorites: 19 / 3,
    totalEntriesNoPlan: 63,
    totalHours: 17800 / 60,
    totalDays: 17800 / 1440,
    percentRated: (56 / 63) * 100,
    mediaTypes: [MediaType.SERIES, MediaType.MOVIES, MediaType.BOOKS],
    mediaTimeDistribution: [
        { name: MediaType.SERIES, value: 140 },
        { name: MediaType.MOVIES, value: 6200 / 60 },
        { name: MediaType.BOOKS, value: 3200 / 60 },
    ],
} satisfies MediaGlobalSummaryType;


const userUpdates = [
    {
        id: -201,
        userId: -1,
        mediaId: ONBOARDING_MOVIE_ID,
        mediaName: "Interstellar",
        mediaType: MediaType.MOVIES,
        updateType: UpdateType.STATUS,
        timestamp: "2026-06-18 20:30:00",
        payload: { old_value: Status.PLAN_TO_WATCH, new_value: Status.COMPLETED },
    },
    {
        id: -202,
        userId: -1,
        mediaId: -103,
        updateType: UpdateType.TV,
        mediaName: "13 Reasons Why",
        mediaType: MediaType.SERIES,
        timestamp: "2026-06-17 21:15:00",
        payload: { old_value: [2, 4], new_value: [2, 5] },
    },
    {
        id: -203,
        userId: -1,
        mediaId: -104,
        mediaType: MediaType.BOOKS,
        updateType: UpdateType.PAGE,
        timestamp: "2026-06-16 19:40:00",
        mediaName: "Journal d'un AssaSynth",
        payload: { old_value: 126, new_value: 184 },
    },
    {
        id: -204,
        userId: -1,
        mediaId: -105,
        mediaName: "Hades",
        mediaType: MediaType.GAMES,
        updateType: UpdateType.PLAYTIME,
        timestamp: "2026-06-15 22:05:00",
        payload: { old_value: 1260, new_value: 1380 },
    },
    {
        id: -205,
        userId: -1,
        mediaId: -102,
        mediaType: MediaType.MOVIES,
        updateType: UpdateType.REDO,
        timestamp: "2026-06-14 20:10:00",
        mediaName: "The Lord of the Rings: The Two Towers",
        payload: { old_value: 1, new_value: 2 },
    },
] satisfies UserUpdateType[];


const followsUpdates = [
    {
        id: -206,
        userId: -2,
        mediaId: -104,
        username: "Sam",
        mediaType: MediaType.BOOKS,
        updateType: UpdateType.PAGE,
        timestamp: "2026-06-18 18:45:00",
        mediaName: "Journal d'un AssaSynth",
        payload: { old_value: 84, new_value: 126 },
    },
    {
        id: -207,
        userId: -3,
        mediaId: -106,
        username: "Morgan",
        mediaName: "Severance",
        updateType: UpdateType.TV,
        mediaType: MediaType.SERIES,
        timestamp: "2026-06-18 17:20:00",
        payload: { old_value: [1, 7], new_value: [1, 8] },
    },
    {
        id: -208,
        userId: -4,
        mediaId: -107,
        username: "Charlie",
        mediaName: "Arrival",
        mediaType: MediaType.MOVIES,
        updateType: UpdateType.STATUS,
        timestamp: "2026-06-18 15:05:00",
        payload: { old_value: Status.PLAN_TO_WATCH, new_value: Status.COMPLETED },
    },
    {
        id: -209,
        userId: -5,
        mediaId: -108,
        username: "Robin",
        mediaName: "Celeste",
        mediaType: MediaType.GAMES,
        updateType: UpdateType.PLAYTIME,
        timestamp: "2026-06-17 23:30:00",
        payload: { old_value: 420, new_value: 510 },
    },
    {
        id: -210,
        userId: -6,
        mediaId: -109,
        username: "Taylor",
        mediaName: "Vinland Saga",
        mediaType: MediaType.MANGA,
        updateType: UpdateType.CHAPTER,
        timestamp: "2026-06-17 19:10:00",
        payload: { old_value: 117, new_value: 121 },
    },
] satisfies (UserUpdateType & { username: string })[];


const achievements = [
    {
        id: -301,
        name: "Cinephile Marathoner",
        completedAt: "2026-06-12 19:00:00",
        description: "Awarded for completing movies, because real life has too few explosions and car chases.",
        difficulty: AchievementDifficulty.SILVER,
    },
    {
        id: -302,
        name: "Couch Potato",
        completedAt: "2026-06-02 19:00:00",
        description: "Awarded for completing series, because finishing what you started is a true feat!",
        difficulty: AchievementDifficulty.GOLD,
    },
    {
        id: -303,
        name: "Sci-Fi Navigator",
        completedAt: "2026-05-28 19:00:00",
        description: "Awarded for completing Science Fiction movies, because you like your plot twists served with a side of quantum stuff.",
        difficulty: AchievementDifficulty.BRONZE,
    },
] satisfies AchievementsType;


export const onboardingProfileFixture = {
    userData: {
        ratingSystem: RatingSystemType.SCORE,
        userMediaSettings: [
            { mediaType: MediaType.SERIES, active: true, timeSpent: 80054 },
            { mediaType: MediaType.ANIME, active: false, timeSpent: 0 },
            { mediaType: MediaType.MOVIES, active: true, timeSpent: 167000 },
            { mediaType: MediaType.GAMES, active: true, timeSpent: 807865 },
            { mediaType: MediaType.BOOKS, active: true, timeSpent: 12540 },
            { mediaType: MediaType.MANGA, active: false, timeSpent: 0 },
        ],
    },
    userUpdates,
    achievements,
    followsUpdates,
    perMediaSummary,
    highlightedMedia,
    mediaGlobalSummary,
};


export const onboardingMovieFixture = {
    redo: 2,
    id: -401,
    total: 3,
    userId: -1,
    rating: 7.5,
    common: false,
    favorite: true,
    customCover: null,
    status: Status.COMPLETED,
    mediaName: "Interstellar",
    imageCover: onboardingCover,
    mediaId: ONBOARDING_MOVIE_ID,
    addedAt: "2026-01-10 12:00:00",
    releaseNotificationsEnabled: true,
    lastUpdated: "2026-06-18 20:30:00",
    ratingSystem: RatingSystemType.SCORE,
    comment: "A favorite for the soundtrack and its sense of scale.",
    tags: [
        { id: -1, name: "Sci-Fi" },
        { id: -2, name: "Top 10" },
        { id: -3, name: "Cinema" },
    ],
} satisfies ExtractListByType<typeof MediaType.MOVIES>;


export const onboardingAddMediaFixture = {
    media: {
        providerData: {
            name: "TMDB",
            url: "https://www.themoviedb.org/movie/157336",
        },
    },
    userMedia: onboardingMovieFixture,
};


export const onboardingListPagination = {
    page: 1,
    perPage: 24,
    totalPages: 2,
    totalItems: 48,
    sorting: "Title A-Z",
    availableSorting: ["Title A-Z", "Rating +", "Recently Modified"],
};
