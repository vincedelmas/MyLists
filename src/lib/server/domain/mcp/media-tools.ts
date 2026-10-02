import z from "zod";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
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
    register("media_details", {
        inputSchema: mediaDetailsSchema.strict(),
        description: "Read catalog details, the connected user's list entry, follow information and similar media. " +
            "userMedia is null when the media is absent from the user's list. mediaId is a MyLists ID, not a provider ID.",
    }, data => getMediaDetails({ data }));

    register("tv_seasons", {
        inputSchema: tvSeasonsInputSchema,
        description: "Read the connected user's series/anime seasons, including episode counts, season ratings and rewatches.",
    }, data => getTvSeasons({ data: { ...data, userId } }));

    register("game_platforms", {
        inputSchema: mediaTypeMediaIdSchema.strict(),
        description: "Read compatible platforms for a game. mediaType must be games.",
    }, data => getGameCompatiblePlatforms({ data }));

    register("media_history", {
        inputSchema: mediaTypeMediaIdSchema.strict(),
        description: "Read the connected user's tracking history for one media entry, newest first. " +
            "Use completion/rewatch events for watching dates; rating, comment and tag edits do not mean the media was watched.",
    }, data => getUserMediaHistory({ data }));

    register("search_catalog", {
        inputSchema: mediaSearchInputSchema,
        annotations: { openWorldHint: true },
        description: "Search the same catalogs as the website using query, page and apiProvider. " +
            "Advanced filters must match that provider. TMDB supports movies/TV; results distinguish series and anime. " +
            "Result id is the external provider ID (books use strings); mediaId is a MyLists ID when already stored. " +
            "Use resolve_catalog_media to obtain a MyLists ID before adding. Ask when titles are ambiguous.",
    }, data => getSearchResults({ data }));

    register("game_search_options", {
        inputSchema: z.object({}).strict(),
        annotations: { openWorldHint: true },
        description: "Read available game genre and platform IDs for advanced catalog searches.",
    }, () => getGameAdvancedSearchOptions());

    register("search_my_list", {
        inputSchema: mediaListInputSchema,
        description: "Browse the connected user's list using the website's args: pagination, sorting, search, tags, " +
            "status, favorite, comment and media-specific filters. Read my_list_filters and " +
            "search_my_list_filters for selectable values. Returns results, mediaType and userData. " +
            "results.pagination.availableSorting lists valid sorting keys; pagination.sorting is the sort actually applied. " +
            "Recently Modified includes edits to ratings/notes and is not a watching date. Use media_history for recorded watching events.",
    }, data => getMediaListSF({ data: { ...data, username } }));

    register("my_list_filters", {
        inputSchema: mediaListFiltersInputSchema,
        description: "Read available filter values, including tags, for the connected user's media list.",
    }, data => getMediaListFilters({ data: { ...data, username } }));

    register("search_my_list_filters", {
        inputSchema: mediaListSearchFiltersInputSchema,
        description: "Search people or companies selectable as filters in the connected user's list, using job and query. " +
            "creator means movie directors, TV creators, book/manga authors, or game developers. " +
            "actor applies to movies/TV, platform to TV networks, and publisher to manga/games.",
    }, data => getMediaListSearchFilters({ data: { ...data, username } }));

    register("my_tags", {
        inputSchema: userTagNamesSchema.strict(),
        description: "Read the connected user's existing tag names for a media type.",
    }, data => getUserTagNames({ data }));

    register("resolve_catalog_media", {
        write: true,
        inputSchema: externalMediaResolveSchema.strict(),
        annotations: { openWorldHint: true },
        description: "Resolve a provider apiId and mediaType to a MyLists mediaId, importing catalog details if needed. " +
            "This does not add the media to the user's list; call add_media separately.",
    }, data => resolveExternalMedia({ data }));

    register("add_media", {
        write: true,
        inputSchema: addMediaToListSchema.strict(),
        annotations: { idempotentHint: false },
        description: "Add a MyLists mediaId to the connected user's list with an optional status. " +
            "Uses the media type's default status when omitted. Set a rating separately with update_media.",
    }, data => postAddMediaToList({ data }));

    register("update_media", {
        write: true,
        inputSchema: updateUserMediaSchema.strict(),
        annotations: { destructiveHint: true },
        description: "Modify one existing list entry using the website's payload: type and its corresponding field. " +
            "Ratings are 0–10; progress, playtime (minutes) and repeats are absolute totals. " +
            "TV position uses currentSeason/currentEpisode; TV rewatches use explicit seasonRedos. " +
            "Status changes can reset progress/repeats. Read the current entry and seasons first. " +
            `loggedAt uses YYYY-MM-DD from ${MIN_ACTIVITY_DATE} through today, only for activity commands. ` +
            "kind=saved confirms success; kind=correction-required " +
            "returns an activity preview without saving. Review that preview before supplying activityCorrection.",
    }, data => postUpdateUserMedia({ data }));

    register("edit_media_tag", {
        write: true,
        inputSchema: editMediaTagInputSchema,
        annotations: { idempotentHint: false, destructiveHint: true },
        description: "Add a tag to one own-list entry (action=add) or detach it (action=deleteOne). " +
            "Pass mediaId and tag.name. Global tag renaming/deletion are unavailable.",
    }, data => postEditUserTag({ data }));

    register("update_media_cover", {
        write: true,
        inputSchema: mediaCoverInputSchema,
        annotations: { openWorldHint: true, destructiveHint: true },
        description: "Set a list entry's custom cover with imageUrl, or restore the catalog cover with remove=true. " +
            "Provide one option; image uploads are available on the website.",
    }, data => postUpdateUserCustomCover({ data }));
};
