import type {MobileProfile, MobileProfileActivity} from "../../lib/api-client";
import {zeroPad} from "@/lib/utils/formatting/number";
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
            return `S${zeroPad(season)}.E${zeroPad(episode)}`;
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

export const formatActivityParts = (update: Activity, ratingSystem: RatingSystem) => {
    if (!update.payload) return { prefix: "", before: null, after: "Entry updated" };
    const labels = { rating: "Rating", comment: "Comments", platform: "Platform", redo: "Repeats" } as const;
    const prefix = update.updateType in labels ? `${labels[update.updateType as keyof typeof labels]}: ` : "";
    const oldValue = update.payload.old_value;
    return {
        prefix,
        before: oldValue === null || oldValue === undefined || oldValue === "" ? null : activityValue(oldValue, update, ratingSystem),
        after: activityValue(update.payload.new_value, update, ratingSystem)
    };
};

export const formatActivity = (update: Activity, ratingSystem: RatingSystem) => {
    const { prefix, before, after } = formatActivityParts(update, ratingSystem);
    return `${prefix}${before === null ? "" : `${before} → `}${after}`;
};
