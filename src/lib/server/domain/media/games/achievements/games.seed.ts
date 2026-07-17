import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";


export const gamesAchievements = [
    {
        codeName: "completed_games",
        name: "Gaming Completionist",
        description:
            "Awarded for completing games, because finishing a game is the only thing that counts in the endless cycle of gaming.",
        mediaType: MediaType.GAMES,
        tiers: [
            {
                criteria: { count: 50 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 100 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 150 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 250 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "rated_games",
        name: "Critique Commander",
        description:
            "Awarded for rating games, because everyone needs to know that that boss fight was so unfair!",
        mediaType: MediaType.GAMES,
        tiers: [
            {
                criteria: { count: 20 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 40 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 80 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 120 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "comment_games",
        name: "Commentary Crusader",
        description:
            "Awarded for commenting games, because your opinions on loot boxes are too hot to keep to yourself!",
        mediaType: MediaType.GAMES,
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
                criteria: { count: 30 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 50 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "developer_games",
        name: "Devoted Fan",
        description:
            "Awarded for playing games from the same developers, showing your unwavering loyalty to your favorite game creators!",
        mediaType: MediaType.GAMES,
        value: "developer",
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
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 10 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "publisher_games",
        name: "Publisher Pal",
        description: "Awarded for playing games from the same publishers, because you've sworn an oath to defend their titles from all foes!",
        mediaType: MediaType.GAMES,
        value: "publisher",
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
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 10 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "first_person_games",
        name: "First-Person Pro",
        description:
            "Awarded for playing First Person Perspective games, because you prefer to see the world through your character's eyes—and their shaky hands.",
        mediaType: MediaType.GAMES,
        value: "First person",
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
                criteria: { count: 40 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 60 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "hack_slash_games",
        name: "Slash & Dash",
        description:
            "Awarded for completing Hack & Slash games, because sometimes, mashing buttons is the best form of therapy!.",
        mediaType: MediaType.GAMES,
        value: "Hack and Slash",
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
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 15 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "multiplayer_games",
        name: "Multiplayer Maestro",
        description:
            "Awarded for playing multiplayer games, because teamwork makes the dream work—until it doesn’t!",
        mediaType: MediaType.GAMES,
        value: "Multiplayer",
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
                criteria: { count: 40 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "log_hours_games",
        name: "Time Sink Extraordinaire",
        description:
            "Awarded for logging hours, because you’ve officially become a time lord in the gaming universe!",
        mediaType: MediaType.GAMES,
        tiers: [
            {
                criteria: { count: 200 },
                difficulty: AchievementDifficulty.BRONZE,
            },
            {
                criteria: { count: 800 },
                difficulty: AchievementDifficulty.SILVER,
            },
            {
                criteria: { count: 2000 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 5000 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "platform_games",
        name: "Platform Hopper",
        description:
            "Awarded for playing games on different platforms, proving you're a true adventurer who leaves no console unturned!",
        mediaType: MediaType.GAMES,
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
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 12 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "pc_games",
        name: "PC Mastermind",
        description:
            "Awarded for playing games on PC, because you like modding your way through every title!",
        mediaType: MediaType.GAMES,
        value: "PC",
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
                criteria: { count: 50 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 100 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "short_games",
        name: "Short Game Sage",
        description:
            "Awarded for completing games under 5 hours, because you appreciate the beauty of bite-sized adventures that pack a punch!",
        mediaType: MediaType.GAMES,
        value: 300,
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
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 15 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
    {
        codeName: "long_games",
        name: "Epic Adventurer",
        description:
            "Awarded for completing games above 100 hours, because your gaming journey is basically an epic saga at this point!",
        mediaType: MediaType.GAMES,
        value: 6000,
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
                criteria: { count: 8 },
                difficulty: AchievementDifficulty.GOLD,
            },
            {
                criteria: { count: 12 },
                difficulty: AchievementDifficulty.PLATINUM,
            },
        ],
    },
] as const;
