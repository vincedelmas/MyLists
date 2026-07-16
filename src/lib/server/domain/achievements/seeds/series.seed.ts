import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";


export const seriesAchievements = [
    {
        codeName: "completed_series",
        name: "Couch Potato",
        description: "Awarded for completing series, because finishing what you started is a true feat!",
        mediaType: MediaType.SERIES,
        tiers: [
            { criteria: { count: 30 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 100 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 175 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 250 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "rated_series",
        name: "TV Rater",
        description: "Awarded for rating series, sharing your opinions with the world.",
        mediaType: MediaType.SERIES,
        tiers: [
            { criteria: { count: 20 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 50 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 100 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 150 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "short_series",
        name: "Episode Economist",
        description: "Awarded for completing series with less than 8 episodes, proving than good things come in small packages!",
        mediaType: MediaType.SERIES,
        value: 8,
        tiers: [
            { criteria: { count: 5 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 15 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 30 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "long_series",
        name: "Marathon Maverick",
        description: "Awarded for completing series with over 150 episodes, because who needs sleep anyway?",
        mediaType: MediaType.SERIES,
        value: 150,
        tiers: [
            { criteria: { count: 1 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 3 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 7 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "comedy_series",
        name: "Laugh Track Legend",
        description: "Awarded for completing comedy series, because laughter is the best medicine!",
        mediaType: MediaType.SERIES,
        value: "Comedy",
        tiers: [
            { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 40 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 70 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "drama_series",
        name: "Drama Queen",
        description: "Awarded for completing drama series, embracing the emotional roller-coaster!",
        mediaType: MediaType.SERIES,
        value: "Drama",
        tiers: [
            { criteria: { count: 15 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 35 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 60 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 80 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "network_series",
        name: "Channel Surfer",
        description: "Awarded for watching series from different networks, mastering the remote like a pro!",
        mediaType: MediaType.SERIES,
        tiers: [
            { criteria: { count: 15 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 25 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 40 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 60 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
] as const;
