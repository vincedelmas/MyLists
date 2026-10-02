import z from "zod";
import {getTvSeasons} from "@/lib/server/functions/tv-seasons";
import {mediaTypeMediaIdSchema} from "@/lib/schemas/common.schema";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import {getSearchResults, getGameAdvancedSearchOptions} from "@/lib/server/functions/search";
import {mediaDetailsSchema, externalMediaResolveSchema} from "@/lib/schemas/media-details.schema";
import {addMediaToListSchema, updateUserMediaSchema, userTagNamesSchema} from "@/lib/schemas/user-media.schema";
import {getMediaListSF, getMediaListFilters, getMediaListSearchFilters} from "@/lib/server/functions/media-lists";
import {getMediaDetails, resolveExternalMedia, getGameCompatiblePlatforms} from "@/lib/server/functions/media-details";
import {postAddMediaToList, postUpdateUserMedia, postEditUserTag, postUpdateUserCustomCover, getUserMediaHistory, getUserTagNames} from "@/lib/server/functions/user-media";
import {
    mediaListInputSchema,
    mediaListFiltersInputSchema,
    mediaListSearchFiltersInputSchema,
    tvSeasonsInputSchema,
    mediaSearchInputSchema,
    editMediaTagInputSchema,
    mediaCoverInputSchema
} from "@/lib/server/domain/mcp/tool-schemas";


export const registerMediaTools = ({ register, userId, username }: ToolContext) => {
    register("getMediaDetails", {
        inputSchema: mediaDetailsSchema.strict(),
        description: "Read catalog details, the connected user's list entry, follow information and similar media. " +
            "userMedia is null when the media is absent from the user's list. mediaId is a MyLists ID, not a provider ID.",
    }, data => getMediaDetails({ data }));

    register("getTvSeasons", {
        inputSchema: tvSeasonsInputSchema,
        description: "Read the connected user's series/anime seasons, including episode counts, season ratings and rewatches.",
    }, data => getTvSeasons({ data: { ...data, userId } }));

    register("getGameCompatiblePlatforms", {
        inputSchema: mediaTypeMediaIdSchema.strict(),
        description: "Read compatible platforms for a game. mediaType must be games.",
    }, data => getGameCompatiblePlatforms({ data }));

    register("getUserMediaHistory", {
        inputSchema: mediaTypeMediaIdSchema.strict(),
        description: "Read the connected user's tracking history for one media entry.",
    }, data => getUserMediaHistory({ data }));

    register("getSearchResults", {
        inputSchema: mediaSearchInputSchema,
        annotations: { openWorldHint: true },
        description: "Search the same catalogs as the website using query, page and apiProvider. " +
            "Advanced filters must match that provider. TMDB supports movies/TV; results distinguish series and anime. " +
            "Result id is the external provider ID (books use strings); mediaId is a MyLists ID when already stored. " +
            "Use resolveExternalMedia to obtain a MyLists ID before adding. Ask when titles are ambiguous.",
    }, data => getSearchResults({ data }));

    register("getGameAdvancedSearchOptions", {
        inputSchema: z.object({}).strict(),
        annotations: { openWorldHint: true },
        description: "Read available game genre and platform IDs for advanced catalog searches.",
    }, () => getGameAdvancedSearchOptions());

    register("getMediaListSF", {
        inputSchema: mediaListInputSchema,
        description: "Browse the connected user's list using the website's args: pagination, sorting, search, tags, " +
            "status, favorite, comment and media-specific filters. Read getMediaListFilters and " +
            "getMediaListSearchFilters for selectable values. Returns results, mediaType and userData.",
    }, data => getMediaListSF({ data: { ...data, username } }));

    register("getMediaListFilters", {
        inputSchema: mediaListFiltersInputSchema,
        description: "Read available filter values, including tags, for the connected user's media list.",
    }, data => getMediaListFilters({ data: { ...data, username } }));

    register("getMediaListSearchFilters", {
        inputSchema: mediaListSearchFiltersInputSchema,
        description: "Search people or companies selectable as filters in the connected user's list, using job and query.",
    }, data => getMediaListSearchFilters({ data: { ...data, username } }));

    register("getUserTagNames", {
        inputSchema: userTagNamesSchema.strict(),
        description: "Read the connected user's existing tag names for a media type.",
    }, data => getUserTagNames({ data }));

    register("resolveExternalMedia", {
        write: true,
        inputSchema: externalMediaResolveSchema.strict(),
        annotations: { openWorldHint: true },
        description: "Resolve a provider apiId and mediaType to a MyLists mediaId, importing catalog details if needed. " +
            "This does not add the media to the user's list; call postAddMediaToList separately.",
    }, data => resolveExternalMedia({ data }));

    register("postAddMediaToList", {
        write: true,
        inputSchema: addMediaToListSchema.strict(),
        annotations: { idempotentHint: false },
        description: "Add a MyLists mediaId to the connected user's list with an optional status. " +
            "Uses the media type's default status when omitted. Set a rating separately with postUpdateUserMedia.",
    }, data => postAddMediaToList({ data }));

    register("postUpdateUserMedia", {
        write: true,
        inputSchema: updateUserMediaSchema.strict(),
        annotations: { destructiveHint: true },
        description: "Modify one existing list entry using the website's payload: type and its corresponding field. " +
            "Ratings are 0–10; progress, playtime (minutes) and repeats are absolute totals. " +
            "TV position uses currentSeason/currentEpisode; TV rewatches use explicit seasonRedos. " +
            "Status changes can reset progress/repeats. Read the current entry and seasons first. " +
            "loggedAt applies only to activity commands. kind=saved confirms success; kind=correction-required " +
            "returns an activity preview without saving. Review that preview before supplying activityCorrection.",
    }, data => postUpdateUserMedia({ data }));

    register("postEditUserTag", {
        write: true,
        inputSchema: editMediaTagInputSchema,
        annotations: { idempotentHint: false },
        description: "Add a tag to one own-list entry (action=add) or detach it (action=deleteOne). " +
            "Pass mediaId and tag.name. Global tag renaming/deletion are unavailable.",
    }, data => postEditUserTag({ data }));

    register("postUpdateUserCustomCover", {
        write: true,
        inputSchema: mediaCoverInputSchema,
        annotations: { openWorldHint: true },
        description: "Set a list entry's custom cover with imageUrl, or restore the catalog cover with remove=true. " +
            "Provide one option; image uploads are available on the website.",
    }, data => postUpdateUserCustomCover({ data }));
};
