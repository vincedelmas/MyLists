import type {MobileProfile, MobileProfileActivity} from "../../lib/api-client";
import {ratingLabel} from "../../lib/ratings";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {toActivityDisplayValue} from "@/lib/utils/media/activity";

export const formatCount = (value: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);

type Activity = Pick<MobileProfileActivity[number], "payload" | "mediaType" | "updateType">;
type RatingSystem = MobileProfile["user"]["ratingSystem"];

const activityValue = (value: unknown, update: Activity, ratingSystem: RatingSystem): string => {
    if (value === null || value === undefined || value === "") return "Not set";
    switch (update.updateType) {
        case "tv": {
            const [season, episode] = value as [number, number];
            return `S${season} · E${episode}`;
        }
        case "rating":
            return ratingSystem === "score" ? `${value}/10` : ratingLabel(Number(value), ratingSystem);
        case "playtime":
            return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(toActivityDisplayValue(update.mediaType, Number(value)))} ${getMediaDefinition(update.mediaType).progress.unit.short}`;
        case "page":
            return `Page ${value}`;
        case "chapter":
            return `Chapter ${value}`;
        case "redo":
            return `${value}×`;
        case "favorite":
            return value ? "Favorite" : "Not a favorite";
        default:
            return String(value);
    }
};

export const formatActivity = (update: Activity, ratingSystem: RatingSystem) => {
    if (!update.payload) return "Entry updated";
    const labels = { rating: "Rating", comment: "Comments", platform: "Platform", redo: "Repeats" } as const;
    const label = update.updateType in labels ? `${labels[update.updateType as keyof typeof labels]}: ` : "";
    return `${label}${activityValue(update.payload.old_value, update, ratingSystem)} → ${activityValue(update.payload.new_value, update, ratingSystem)}`;
};
