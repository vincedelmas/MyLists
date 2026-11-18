import {GamesPlatformsEnum} from "@/lib/utils/enums";


const someRetroKeywords = [
    // retro computers
    "acorn",
    "amiga",
    "amstrad",
    "apple ii",
    "atari st",
    "bbc micro",
    "commodore",
    "dragon 32",
    "fm towns",
    "fm-7",
    "msx",
    "pc-",
    "sharp",
    "sinclair",
    "trs-80",
    "zx spectrum",

    // main frames
    "cdc",
    "edsac",
    "hp ",
    "pdp",
    "plato",
    "sds sigma",
    "time-shared mainframe",
];


const platformAliases: Record<string, GamesPlatformsEnum> = {
    "pc (microsoft windows)": GamesPlatformsEnum.PC,
    "windows": GamesPlatformsEnum.PC,
    "microsoft windows": GamesPlatformsEnum.PC,
    "dos": GamesPlatformsEnum.DOS,

    "ios": GamesPlatformsEnum.IPHONE,
    "android": GamesPlatformsEnum.ANDROID,
    "windows phone": GamesPlatformsEnum.WINDOWS_PHONE,
    "windows mobile": GamesPlatformsEnum.WINDOWS_PHONE,
    "blackberry os": GamesPlatformsEnum.OTHER_MOBILE,
    "legacy mobile device": GamesPlatformsEnum.OTHER_MOBILE,
    "palm os": GamesPlatformsEnum.OTHER_MOBILE,
    "n-gage": GamesPlatformsEnum.OTHER_MOBILE,
    "visionos": GamesPlatformsEnum.VISIONOS,

    "playstation 5": GamesPlatformsEnum.PLAYSTATION_5,
    "playstation 4": GamesPlatformsEnum.PLAYSTATION_4,
    "playstation 3": GamesPlatformsEnum.PLAYSTATION_3,
    "playstation 2": GamesPlatformsEnum.PLAYSTATION_2,
    "playstation": GamesPlatformsEnum.PLAYSTATION,
    "playstation portable": GamesPlatformsEnum.PSP,
    "psp": GamesPlatformsEnum.PSP,
    "playstation vita": GamesPlatformsEnum.PS_VITA,
    "ps vita": GamesPlatformsEnum.PS_VITA,
    "playstation vr2": GamesPlatformsEnum.PLAYSTATION_VR2,
    "playstation vr": GamesPlatformsEnum.PLAYSTATION_VR,
    "pocketstation": GamesPlatformsEnum.OTHER_HANDHELD,

    "xbox series x|s": GamesPlatformsEnum.XBOX_SERIES,
    "xbox series": GamesPlatformsEnum.XBOX_SERIES,
    "xbox one": GamesPlatformsEnum.XBOX_ONE,
    "xbox 360": GamesPlatformsEnum.XBOX_360,
    "xbox": GamesPlatformsEnum.XBOX,

    "nintendo switch 2": GamesPlatformsEnum.NINTENDO_SWITCH_2,
    "nintendo switch": GamesPlatformsEnum.NINTENDO_SWITCH,
    "switch 2": GamesPlatformsEnum.NINTENDO_SWITCH_2,
    "switch": GamesPlatformsEnum.NINTENDO_SWITCH,
    "wii u": GamesPlatformsEnum.WII_U,
    "wii": GamesPlatformsEnum.WII,
    "nintendo gamecube": GamesPlatformsEnum.GAMECUBE,
    "gamecube": GamesPlatformsEnum.GAMECUBE,
    "nintendo 64": GamesPlatformsEnum.NINTENDO_64,
    "64dd": GamesPlatformsEnum.NINTENDO_64,
    "super nintendo entertainment system": GamesPlatformsEnum.SNES,
    "super famicom": GamesPlatformsEnum.SNES,
    "snes": GamesPlatformsEnum.SNES,
    "nintendo entertainment system": GamesPlatformsEnum.NES,
    "family computer": GamesPlatformsEnum.NES,
    "family computer disk system": GamesPlatformsEnum.NES,
    "nes": GamesPlatformsEnum.NES,
    "new nintendo 3ds": GamesPlatformsEnum.NINTENDO_3DS,
    "nintendo 3ds": GamesPlatformsEnum.NINTENDO_3DS,
    "nintendo ds": GamesPlatformsEnum.NINTENDO_DS,
    "nintendo dsi": GamesPlatformsEnum.NINTENDO_DS,
    "game boy advance": GamesPlatformsEnum.GAME_BOY_ADVANCE,
    "game boy color": GamesPlatformsEnum.GAME_BOY_COLOR,
    "game boy": GamesPlatformsEnum.GAME_BOY,
    "game & watch": GamesPlatformsEnum.GAME_AND_WATCH,
    "pokemon mini": GamesPlatformsEnum.OTHER_HANDHELD,
    "virtual boy": GamesPlatformsEnum.OTHER_HANDHELD,
    "e-reader / card-e reader": GamesPlatformsEnum.OTHER_HANDHELD,

    "dreamcast": GamesPlatformsEnum.DREAMCAST,
    "sega saturn": GamesPlatformsEnum.SEGA_SATURN,
    "sega mega drive/genesis": GamesPlatformsEnum.SEGA_GENESIS,
    "sega genesis": GamesPlatformsEnum.SEGA_GENESIS,
    "sega master system/mark iii": GamesPlatformsEnum.SEGA_MASTER_SYSTEM,
    "sega master system": GamesPlatformsEnum.SEGA_MASTER_SYSTEM,
    "sega game gear": GamesPlatformsEnum.SEGA_GAME_GEAR,
    "sega cd": GamesPlatformsEnum.OLD_SEGA_CONSOLE,
    "sega 32x": GamesPlatformsEnum.OLD_SEGA_CONSOLE,
    "sega cd 32x": GamesPlatformsEnum.OLD_SEGA_CONSOLE,
    "sg-1000": GamesPlatformsEnum.OLD_SEGA_CONSOLE,
    "sega pico": GamesPlatformsEnum.OLD_SEGA_CONSOLE,

    "atari 2600": GamesPlatformsEnum.ATARI_2600,
    "atari 5200": GamesPlatformsEnum.ATARI_5200,
    "atari 7800": GamesPlatformsEnum.ATARI_7800,
    "atari jaguar": GamesPlatformsEnum.ATARI_JAGUAR,
    "atari jaguar cd": GamesPlatformsEnum.ATARI_JAGUAR,
    "atari lynx": GamesPlatformsEnum.ATARI_LYNX,
    "atari 8-bit": GamesPlatformsEnum.OLD_ATARI_CONSOLE,
    "atari st/ste": GamesPlatformsEnum.OLD_ATARI_CONSOLE,

    "arcade": GamesPlatformsEnum.ARCADE,
    "neo geo aes": GamesPlatformsEnum.NEO_GEO,
    "neo geo mvs": GamesPlatformsEnum.NEO_GEO,
    "neo geo cd": GamesPlatformsEnum.NEO_GEO,
    "neo geo pocket": GamesPlatformsEnum.NEO_GEO,
    "neo geo pocket color": GamesPlatformsEnum.NEO_GEO,
    "hyper neo geo 64": GamesPlatformsEnum.NEO_GEO,

    "meta quest 3": GamesPlatformsEnum.META_QUEST,
    "meta quest 2": GamesPlatformsEnum.META_QUEST,
    "oculus quest": GamesPlatformsEnum.META_QUEST,
    "oculus rift": GamesPlatformsEnum.OCULUS,
    "oculus go": GamesPlatformsEnum.OCULUS,
    "gear vr": GamesPlatformsEnum.OTHER_VR,

    "3do interactive multiplayer": GamesPlatformsEnum.OTHER_CONSOLE,
    "amstrad gx4000": GamesPlatformsEnum.OTHER_CONSOLE,
    "apple pippin": GamesPlatformsEnum.OTHER_CONSOLE,
    "bally astrocade": GamesPlatformsEnum.OTHER_CONSOLE,
    "colecovision": GamesPlatformsEnum.OTHER_CONSOLE,
    "fairchild channel f": GamesPlatformsEnum.OTHER_CONSOLE,
    "intellivision": GamesPlatformsEnum.OTHER_CONSOLE,
    "odyssey": GamesPlatformsEnum.OTHER_CONSOLE,
    "odyssey 2 / videopac g7000": GamesPlatformsEnum.OTHER_CONSOLE,
    "ouya": GamesPlatformsEnum.OTHER_CONSOLE,
    "philips cd-i": GamesPlatformsEnum.OTHER_CONSOLE,
    "vectrex": GamesPlatformsEnum.OTHER_CONSOLE,
    "zeebo": GamesPlatformsEnum.OTHER_CONSOLE,

    "arduboy": GamesPlatformsEnum.OTHER_HANDHELD,
    "evercade": GamesPlatformsEnum.OTHER_HANDHELD,
    "game.com": GamesPlatformsEnum.OTHER_HANDHELD,
    "gamate": GamesPlatformsEnum.OTHER_HANDHELD,
    "gizmondo": GamesPlatformsEnum.OTHER_HANDHELD,
    "playdate": GamesPlatformsEnum.OTHER_HANDHELD,
    "watara/quickshot supervision": GamesPlatformsEnum.OTHER_HANDHELD,
    "wonderswan": GamesPlatformsEnum.OTHER_HANDHELD,
    "wonderswan color": GamesPlatformsEnum.OTHER_HANDHELD,
};


export const normalizeGamePlatform = (platform: string) => {
    if (!platform) return null;

    const key = platform
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const directMatch = platformAliases[key];
    if (directMatch) return directMatch;

    if (someRetroKeywords.some(k => key.includes(k))) {
        return GamesPlatformsEnum.RETRO_COMPUTER;
    }

    return GamesPlatformsEnum.OTHER;
};


export const normalizeGamePlatforms = (platforms?: { name: string }[]) => {
    const seen = new Set<GamesPlatformsEnum>();

    return (platforms ?? []).reduce<{ name: GamesPlatformsEnum }[]>((acc, platform) => {
        const normalized = normalizeGamePlatform(platform.name);
        if (!normalized || seen.has(normalized)) return acc;

        seen.add(normalized);
        acc.push({ name: normalized });

        return acc;
    }, []);
};
