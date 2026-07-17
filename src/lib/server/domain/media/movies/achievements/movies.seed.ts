import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";


export const moviesAchievements = [
    {
        codeName: "completed_movies",
        name: "Cinephile Marathoner",
        description: "Awarded for completing movies, because real life has too few explosions and car chases.",
        mediaType: MediaType.MOVIES,
        tiers: [
            { criteria: { count: 100 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 400 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 800 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 1500 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "rated_movies",
        name: "Certified Movie Critic",
        description: "Awarded for rating movies, because slapping stars on films is harder than it looks, right?",
        mediaType: MediaType.MOVIES,
        tiers: [
            { criteria: { count: 50 }, difficulty: AchievementDifficulty.BRONZE },
            { criteria: { count: 100 }, difficulty: AchievementDifficulty.SILVER },
            { criteria: { count: 150 }, difficulty: AchievementDifficulty.GOLD },
            { criteria: { count: 250 }, difficulty: AchievementDifficulty.PLATINUM },
        ],
    },
    {
        codeName: "comment_movies",
        name: "Couch Commentator",
        description: "Awarded for commenting movies, because every film deserves your unsolicited director’s cut.",
        mediaType: MediaType.MOVIES,
        tiers: [
            {
                criteria: { count: 20 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 60 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 100 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 150 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "director_movies",
        name: "Director Devotee",
        description: "Awarded for completing movies from the same director, because you’re practically their personal biographer at this point.",
        mediaType: MediaType.MOVIES,
        tiers: [
            {
                criteria: { count: 5 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 12 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 15 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "actor_movies",
        name: "Typecast Connoisseur",
        description:
            "Awarded for completing movies featuring the same actor, because you enjoy watching them save the world—again.",
        mediaType: MediaType.MOVIES,
        tiers: [
            {
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 12 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 15 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 20 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "origin_lang_movies",
        name: "World Tour",
        description:
            "Awarded for completing movies from different languages, proving that subtitles are no match for your wanderlust.",
        mediaType: MediaType.MOVIES,
        tiers: [
            {
                criteria: { count: 3 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 5 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 7 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 10 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "war_genre_movies",
        name: "War Room Veteran",
        description:
            "Awarded for completing War movies, because nothing says relaxation like intense geopolitical conflicts.",
        mediaType: MediaType.MOVIES,
        value: "War",
        tiers: [
            {
                criteria: { count: 5 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 10 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 20 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 30 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "family_genre_movies",
        name: "Family at Heart",
        description:
            "Awarded for completing Family movies, because secretly, you just miss the talking animals.",
        mediaType: MediaType.MOVIES,
        value: "Family",
        tiers: [
            {
                criteria: { count: 10 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 20 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 35 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 50 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "sci_genre_movies",
        name: "Sci-Fi Navigator",
        description:
            "Awarded for completing Science Fiction movies, because you like your plot twists served with a side of quantum stuff.",
        mediaType: MediaType.MOVIES,
        value: "Science Fiction",
        tiers: [
            {
                criteria: { count: 10 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 20 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 35 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 50 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "animation_movies",
        name: "Animation Enthusiast",
        description:
            "Awarded for completing Animation movies, because you know that cartoons aren’t just for kids.",
        mediaType: MediaType.MOVIES,
        value: "Animation",
        tiers: [
            {
                criteria: { count: 10 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 20 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 35 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 50 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "long_movies",
        name: "Epic Endurance",
        description:
            "Awarded for completing movies longer than 2h30, because you’ve trained for the cinematic marathon.",
        mediaType: MediaType.MOVIES,
        value: 151,
        tiers: [
            {
                criteria: { count: 12 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 25 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 35 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 45 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "short_movies",
        name: "Short Attention Span",
        description:
            "Awarded for completing movies shorter than 1h30, because ain’t nobody got time for three-hour epics.",
        mediaType: MediaType.MOVIES,
        value: 89,
        tiers: [
            {
                criteria: { count: 12 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 25 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 35 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 45 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
] as const;
