import type {MobileProfile, MobileProfileActivity} from "../../lib/api-client";

export const formatCount = (value: number) => new Intl.NumberFormat("en", {maximumFractionDigits: 0}).format(value);

export const formatActivity = (
    update: MobileProfileActivity[number],
    ratingSystem: MobileProfile["user"]["ratingSystem"],
) => {
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
            return `${new Intl.NumberFormat("en", {maximumFractionDigits: 1}).format(value / 60)} hours played`;
        case "rating":
            return value === null
                ? "Rating removed"
                : ratingSystem === "score"
                  ? `Rated ${value}/10`
                  : "Feeling updated";
        case "favorite":
            return value ? "Added to favorites" : "Removed from favorites";
        case "redo":
            return update.mediaType === "games"
                ? "Replayed"
                : ["books", "manga"].includes(update.mediaType)
                  ? "Read again"
                  : "Rewatched";
        case "comment":
            return "Note updated";
        case "platform":
            return "Platform updated";
    }
};
