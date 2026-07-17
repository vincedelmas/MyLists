import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";


export const animeAchievements = [
    {
        codeName: 'completed_anime',
        name: 'Binge No Jutsu!',
        description: "Awarded for completing anime, because who needs sleep when there's just one more episode?",
        mediaType: MediaType.ANIME,
        tiers: [
            { criteria: { count: 20 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 50 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 120 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 200 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'rated_anime',
        name: 'Rate My Waifu',
        description: 'Awarded for rating anime, because judging anime is serious business...',
        mediaType: MediaType.ANIME,
        tiers: [
            { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 30 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 50 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 100 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'comment_anime',
        name: 'Weeb-splainer',
        description: 'Awarded for commenting anime, because sometimes a 3-paragraph rant about plot holes is necessary.',
        mediaType: MediaType.ANIME,
        tiers: [
            { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 30 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'short_anime',
        name: 'Short King',
        description: "Awarded for watching anime with less than 20 episodes, because this anime will never have another season!",
        mediaType: MediaType.ANIME,
        value: 20,
        tiers: [
            { criteria: { count: 5 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 8 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 12 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'long_anime',
        name: 'Filler Arc Survivor',
        description: 'Awarded for watching anime with more than 200 episodes, because you powered through the 50 flashbacks and 20 beach episodes.',
        mediaType: MediaType.ANIME,
        value: 200,
        tiers: [
            { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 7 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 9 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'shonen_anime',
        name: 'Shonen Showdown!',
        description:
            "Awarded for watching Shonen anime, because power-ups and friendship speeches never get old.",
        mediaType: MediaType.ANIME,
        value: 'Shounen',
        tiers: [
            { criteria: { count: 7 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 12 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 17 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 22 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'seinen_anime',
        name: 'Seinen Sage!',
        description: "Awarded for completing Seinen anime, because you're too deep into complex plots to enjoy slice-of-life fluff.",
        mediaType: MediaType.ANIME,
        value: 'Seinen',
        tiers: [
            { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 12 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'network_anime',
        name: 'Network Lurker',
        description: 'Awarded for watching anime from different networks, because consistency is key, or maybe your subscription just auto-renewed.',
        mediaType: MediaType.ANIME,
        tiers: [
            { criteria: { count: 8 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 16 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 20 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 30 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: 'actor_anime',
        name: 'Seiyuu Sensei',
        description: 'Awarded for watching anime featuring the same voice actor, because now you can spot that voice faster than an anime power-up scream.',
        mediaType: MediaType.ANIME,
        tiers: [
            { criteria: { count: 8 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 12 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 15 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 22 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
] as const;
