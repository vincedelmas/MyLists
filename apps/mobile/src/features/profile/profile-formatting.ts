import type {MobileProfile, MobileProfileActivity} from "../../lib/api-client";


export const mediaPresentation: Record<MobileProfile["lists"][number]["mediaType"], { label: string; mark: string; color: string }> = {
    movies: { label: "Movies", mark: "MV", color: "#A9DAB7" },
    series: { label: "TV series", mark: "TV", color: "#92BBD7" },
    anime: { label: "Anime", mark: "AN", color: "#D7A9BF" },
    games: { label: "Games", mark: "GM", color: "#B5ABD8" },
    books: { label: "Books", mark: "BK", color: "#DBC39B" },
    manga: { label: "Manga", mark: "MG", color: "#D8AA96" },
};


export const formatCount = (value: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);


export const formatActivity = (update: MobileProfileActivity[number], ratingSystem: MobileProfile["user"]["ratingSystem"]) => {
    if (!update.payload) return "Entry updated";
    const value = update.payload.new_value;
    switch (update.updateType) {
        case "status":
            return value ?? "Status updated";
        case "tv":
            return `Season ${value[0]} · Episode ${value[1]}`;
        case "page":
            return `Page ${formatCount(value)}`;
        case "chapter":
            return `Chapter ${formatCount(value)}`;
        case "playtime":
            return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value / 60)} hours played`;
        case "rating":
            return value === null ? "Rating removed" : ratingSystem === "score" ? `Rated ${value}/10` : "Feeling updated";
        case "favorite":
            return value ? "Added to favorites" : "Removed from favorites";
        case "redo":
            return update.mediaType === "games" ? "Replayed" : ["books", "manga"].includes(update.mediaType) ? "Read again" : "Rewatched";
        case "comment":
            return "Note updated";
        case "platform":
            return "Platform updated";
    }
};
