import {capitalize} from "@/lib/utils/formatting/text";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import {SMART_VIEW_STATUS_OPTIONS} from "@/lib/client/components/smart-views/smart-view.config";


export const smartViewRules = (spec: SmartViewSpec): string[] => {
    const rules: string[] = [];

    const {
        search, statuses, statusGroup, addedBefore, addedWithin, updatedBefore, minRating, maxRating,
        rated, favorite, hasComment, minReleaseYear, maxReleaseYear, genres, tags, tagsMatch, excludeTags,
    } = spec.filters;

    if (search) rules.push(`Title contains “${search}”`);

    if (statuses?.length) rules.push(statuses.join(" or "));

    if (statusGroup) {
        rules.push(SMART_VIEW_STATUS_OPTIONS.find(option => option.value === statusGroup)!.label);
    }

    if (addedBefore) {
        rules.push(`Added over ${addedBefore.monthsAgo} ${addedBefore.monthsAgo === 1 ? "month" : "months"} ago`);
    }

    if (addedWithin) rules.push(`Added in the last ${addedWithin.monthsAgo} ${addedWithin.monthsAgo === 1 ? "month" : "months"}`);

    if (updatedBefore) rules.push(`Not updated in ${updatedBefore.monthsAgo} ${updatedBefore.monthsAgo === 1 ? "month" : "months"}`);

    if (rated !== undefined) rules.push(rated ? "Rated titles" : "Unrated titles");

    if (hasComment !== undefined) rules.push(hasComment ? "With a comment" : "Without a comment");

    if (genres?.length) rules.push(`Genre: ${genres.join(" or ")}`);

    if (minReleaseYear !== undefined && maxReleaseYear !== undefined) rules.push(`Released ${minReleaseYear}–${maxReleaseYear}`);
    else if (minReleaseYear !== undefined) rules.push(`Released from ${minReleaseYear}`);
    else if (maxReleaseYear !== undefined) rules.push(`Released through ${maxReleaseYear}`);

    if (minRating !== undefined && maxRating !== undefined) {
        rules.push(`Rated ${minRating}–${maxRating} / 10`);
    }
    else if (minRating !== undefined) {
        rules.push(`Rated at least ${minRating} / 10`);
    }
    else if (maxRating !== undefined) {
        rules.push(`Rated at most ${maxRating} / 10`);
    }

    if (favorite !== undefined) {
        rules.push(favorite ? "Favorites only" : "Excluding favorites");
    }

    if (tags?.length) {
        rules.push(`Tagged ${tags.join(tagsMatch === "all" ? " and " : " or ")}`);
    }

    if (excludeTags?.length) rules.push(`Exclude tags: ${excludeTags.join(", ")}`);

    return rules;
};


const smartViewSortLabel = (spec: SmartViewSpec) => {
    const mediaTypes = spec.mediaTypes === "all" ? ALL_MEDIA_TYPES : spec.mediaTypes;

    return getMediaSortOptions(mediaTypes, true).find(option => {
        const sort = MEDIA_SORT_DEFINITIONS[option.value];
        return sort.field === spec.sort.field && sort.direction === spec.sort.direction;
    })!.label;
};


export const smartViewBadgeLabels = (spec: SmartViewSpec, sortLabel = smartViewSortLabel(spec)) => [
    ...(spec.mediaTypes === "all" ? ["All media"] : spec.mediaTypes.map(type => type === "series" ? "TV series" : capitalize(type))),
    ...smartViewRules(spec),
    sortLabel,
];
